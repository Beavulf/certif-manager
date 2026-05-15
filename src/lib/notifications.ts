import { certificateService } from "@/server/services/certificate-service";
import { notificationLogService } from "@/server/services/notification-log-service";
import { notificationSettingsService } from "@/server/services/notification-settings-service";
import { sendExpiryEmail } from "./mail";
import { auditlogService } from "@/server/services/auditlog-service";

export async function checkExpiringCertificates() {
  
  const notifySetting = await notificationSettingsService.findFirst({
    where: {
      isEnabled: true,
    },
  })
  if (!notifySetting) { 
    console.warn('❌ Настройки уведомлений не найдены')

    await auditlogService.log({
      action: 'sendNotification',
      entityType: 'notificationSettings',
      displayName: 'Настройки уведомлений не найдены, при попытке проверки сертификатов',
    })
    return; 
  }

  const checkDays = notifySetting.daysBeforeExpiry ?? [30, 14, 7];
  
  for (const day of checkDays) {
    const today = new Date();
    const targetDate = new Date(today.setDate(today.getDate() + day+1));
    const from = new Date(targetDate.setHours(0, 0, 0, 0));
    const to = new Date(targetDate.setHours(23, 59, 59, 999));

    const certificates = await certificateService.findMany({
      where: {
        validTo: {
          gte: from,
          lt: to,
        },
        status: 'active',
      },
      include: {
        employee: true,
      }
    })
    
    if (!certificates.length) {
      continue;
    }

    for (const certificate of certificates) {
      const ensureAlreadySent = await notificationLogService.ensureAlreadySent(certificate.id, day);
      
      if (ensureAlreadySent) { continue; }
      if (!certificate.employee) { continue; }
      
      const result = await sendExpiryEmail({
        to: certificate.employee.email,
        employeeName: certificate.employee.fullName,
        certCN: certificate.subjectCN,
        validTo: certificate.validTo,
        daysLeft: day,
      },
        notifySetting
      );

      await notificationLogService.create({
        sentTo: certificate.employee.email,
        daysBeforeExpiry: day,
        status: result.success ? 'sent' : 'failed',
        errorMessage: result.error ?? null,

        certificate: { connect: { id: certificate.id } },
      })
    }
  }
}

export async function updateExpiredStatuses() {
  const updated = await certificateService.updateMany({
    where: {
      validTo: { lt: new Date() },
      status: 'active',
    },
    data: { status: 'expired' }
  });

  if (updated.count !== 0) {
    await auditlogService.log({
      action: 'editCertificate',
      entityType: 'certificate',
      displayName: `Обновлено статусов certificates: ${updated.count}`
    })
  }
}