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

export async function startCronJobs() {
  const cron = (await import('node-cron')).default;
  const { checkExpiringCertificates, updateExpiredStatuses } = await import(
    './notifications'
  );
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

  tasks.expiring = cron.schedule(
    expression,
    async () => {
      console.log('[CRON] Checking expiring certificates...');
      try {
        const result = await checkExpiringCertificates({ initiatedBy: 'cron' });
        console.log(`[CRON] Expiring check done: ${result.message}`);
      } catch (error) {
        console.error('[CRON] Expiring certificates check failed:', error);
      }
    },
    { timezone: settings.timezone },
  );

  tasks.expiredStatus = cron.schedule(
    '0 0 * * *',
    async () => {
      console.log('[CRON] Updating expired statuses...');
      try {
        const count = await updateExpiredStatuses();
        console.log(`[CRON] Expired statuses updated: ${count}`);
      } catch (error) {
        console.error('[CRON] Expired status update failed:', error);
      }
    },
    { timezone: settings.timezone },
  );

  console.log(
    `[CRON] Expiring certificates check scheduled at ${settings.cronCheckTime} (${settings.timezone})`,
  );
}

export async function rescheduleCronJobs() {
  await startCronJobs();
}
