import { checkExpiringCertificates, updateExpiredStatuses } from './notifications';
import { appSettingsService } from '@/server/services/app-settings-service';

let expiringCertTask: ReturnType<typeof import('node-cron').schedule> | null = null;
let expiredStatusTask: ReturnType<typeof import('node-cron').schedule> | null = null;

function parseCronTime(time: string): { minute: number; hour: number } {
  const [hourStr, minuteStr] = time.split(':');
  return {
    hour: Number(hourStr),
    minute: Number(minuteStr),
  };
}

export async function startCronJobs() {
  const cron = (await import('node-cron')).default;
  const settings = await appSettingsService.getOrCreate();
  const { hour, minute } = parseCronTime(settings.cronCheckTime);

  expiringCertTask?.stop();
  expiredStatusTask?.stop();

  expiringCertTask = cron.schedule(
    `${minute} ${hour} * * *`,
    async () => {
      console.log('[CRON] Checking expiring certificates...');
      await checkExpiringCertificates({ initiatedBy: 'cron' });
    },
    { timezone: settings.timezone },
  );

  expiredStatusTask = cron.schedule(
    '0 0 * * *',
    async () => {
      console.log('[CRON] Updating expired statuses...');
      await updateExpiredStatuses();
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
