import cron from 'node-cron';
import { checkExpiringCertificates, updateExpiredStatuses } from './notifications';

export const startCronJobs = async () => {
  // Каждый день в 08:00 — проверка истекающих сертификатов
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Checking expiring certificates...');

    await checkExpiringCertificates();
  }, { timezone: 'Europe/Minsk' });

  // Каждую полночь — обновление статусов expired
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Updating expired statuses...');

    await updateExpiredStatuses();
  }, { timezone: 'Europe/Minsk' });
}