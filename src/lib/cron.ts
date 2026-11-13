type CronTask = ReturnType<typeof import('node-cron').schedule>;

type CronGlobal = typeof globalThis & {
  __certManagerCronTasks?: {
    expiring: CronTask | null;
    expiredStatus: CronTask | null;
  };
};

function getCronTasks() {
  const g = globalThis as CronGlobal;
  if (!g.__certManagerCronTasks) {
    g.__certManagerCronTasks = { expiring: null, expiredStatus: null };
  }
  return g.__certManagerCronTasks;
}

function parseCronTime(time: string): { minute: number; hour: number } {
  const [hourStr, minuteStr] = time.split(':');
  return {
    hour: Number(hourStr),
    minute: Number(minuteStr),
  };
}

async function runExpiringCertificatesCheck() {
  const { checkExpiringCertificates } = await import('./notifications');
  console.log('[CRON] Checking expiring certificates...');
  try {
    const result = await checkExpiringCertificates({ initiatedBy: 'cron' });
    console.log(`[CRON] Expiring check done: ${result.message}`);
  } catch (error) {
    console.error('[CRON] Expiring certificates check failed:', error);
  }
}

async function runExpiredStatusesUpdate() {
  const { updateExpiredStatuses } = await import('./notifications');
  console.log('[CRON] Updating expired statuses...');
  try {
    const count = await updateExpiredStatuses();
    console.log(`[CRON] Expired statuses updated: ${count}`);
  } catch (error) {
    console.error('[CRON] Expired status update failed:', error);
  }
}

/**
 * node-cron v4 does not auto-replay missed slots (blocking IO / console freeze).
 * Listening to execution:missed and calling execute() recovers the run.
 */
function recoverMissedExecutions(task: CronTask, label: string) {
  task.on('execution:missed', (ctx) => {
    const when =
      (ctx as { dateLocalIso?: string }).dateLocalIso ??
      String((ctx as { date?: Date }).date ?? 'unknown');
    console.warn(
      `[CRON] Missed ${label} at ${when} — running catch-up now`,
    );
    void task.execute().catch((error) => {
      console.error(`[CRON] Catch-up for ${label} failed:`, error);
    });
  });
}

async function catchUpIfDailyCheckMissedToday(
  cronCheckTime: string,
  timezone: string,
) {
  const dayjs = (await import('@/lib/dayjs-config')).default;
  const { hour, minute } = parseCronTime(cronCheckTime);
  const now = dayjs().tz(timezone);
  const scheduled = dayjs()
    .tz(timezone)
    .hour(hour)
    .minute(minute)
    .second(0)
    .millisecond(0);

  // Still before today's scheduled time — nothing to catch up.
  if (now.isBefore(scheduled)) {
    return;
  }

  const { auditlogService } = await import(
    '@/server/services/auditlog-service'
  );
  const startOfDay = now.startOf('day').toDate();
  const alreadyRan = await auditlogService.findMany({
    where: {
      action: 'sendNotification',
      createdAt: { gte: startOfDay },
      displayName: { startsWith: 'Автоматическая проверка' },
    },
    take: 1,
  });

  if (alreadyRan.length > 0) {
    return;
  }

  console.warn(
    `[CRON] No automatic check found for today after ${cronCheckTime} (${timezone}) — catch-up run`,
  );
  await runExpiringCertificatesCheck();
}

export async function startCronJobs() {
  const cron = (await import('node-cron')).default;
  const { appSettingsService } = await import(
    '@/server/services/app-settings-service'
  );

  const settings = await appSettingsService.getOrCreate();
  const { hour, minute } = parseCronTime(settings.cronCheckTime);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(
      `Invalid cronCheckTime "${settings.cronCheckTime}" — expected HH:MM`,
    );
  }

  const tasks = getCronTasks();
  tasks.expiring?.destroy();
  tasks.expiredStatus?.destroy();
  tasks.expiring = null;
  tasks.expiredStatus = null;

  const expression = `${minute} ${hour} * * *`;
  if (!cron.validate(expression)) {
    throw new Error(`Invalid cron expression: ${expression}`);
  }

  tasks.expiring = cron.schedule(expression, () => runExpiringCertificatesCheck(), {
    name: 'expiring-certificates',
    timezone: settings.timezone,
    noOverlap: true,
    // Daily jobs often wake a bit late on Windows; default 1s is too strict.
    missedExecutionTolerance: 30 * 60_000,
  });
  recoverMissedExecutions(tasks.expiring, 'expiring-certificates');

  tasks.expiredStatus = cron.schedule(
    '0 0 * * *',
    () => runExpiredStatusesUpdate(),
    {
      name: 'expired-status-update',
      timezone: settings.timezone,
      noOverlap: true,
      missedExecutionTolerance: 30 * 60_000,
    },
  );
  recoverMissedExecutions(tasks.expiredStatus, 'expired-status-update');

  console.log(
    `[CRON] Expiring certificates check scheduled at ${settings.cronCheckTime} (${settings.timezone})`,
  );

  // If process was frozen/down at 08:00, still send today's notifications after boot.
  void catchUpIfDailyCheckMissedToday(
    settings.cronCheckTime,
    settings.timezone,
  ).catch((error) => {
    console.error('[CRON] Startup catch-up failed:', error);
  });
}

export async function rescheduleCronJobs() {
  await startCronJobs();
}
