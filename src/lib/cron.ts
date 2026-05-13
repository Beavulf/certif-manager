import cron from 'node-cron';
import { auditlogService } from '@/server/services/auditlog-service';
import { checkExpiringCertificates, updateExpiredStatuses } from './notifications';

export const startCronJobs = async () => {
  console.log('✅ Cron jobs started');

  await auditlogService.log({
    action: 'start_cron_jobs',
    entityType: 'cron',
  });
  
  // Каждый день в 08:00 — проверка истекающих сертификатов
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Checking expiring certificates...');

    await auditlogService.log({
      action: 'check_expiring_certificates',
      entityType: 'cron',
    });

    await checkExpiringCertificates();
  }, { timezone: 'Europe/Minsk' });

  // Каждую полночь — обновление статусов expired
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Updating expired statuses...');

    await auditlogService.log({
      action: 'update_expired_statuses',
      entityType: 'cron',
    });

    await updateExpiredStatuses();
  }, { timezone: 'Europe/Minsk' });
}