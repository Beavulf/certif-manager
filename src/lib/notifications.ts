import { certificateService } from "@/server/services/certificate-service";
import { notificationLogService } from "@/server/services/notification-log-service";
import { notificationSettingsService } from "@/server/services/notification-settings-service";

export async function checkExpiringCertificates() {
  
  const notifySetting = await notificationSettingsService.findFirst({
    where: {
      isEnabled: true,
    },
  })
  if (!notifySetting) { return; }

  const checkDays = notifySetting.daysBeforeExpiry ?? [30, 14, 7];

  for (const day of checkDays) {
    const startOfToday = new Date();
    const targetDate = new Date(startOfToday.getDate() + day);
    const from = new Date(targetDate.setHours(0, 0, 0, 0));
    const to = new Date(targetDate.setHours(23, 59, 59, 999));

    const certificates = await certificateService.findMany({
      where: {
        validTo: {
          gte: from,
          lt: to,
        },
      },
    })
  

    for (const certificate of certificates) {
      const ensureAlreadySent = await notificationLogService.ensureAlreadySent(certificate.id, day);

      if (ensureAlreadySent) { continue; }

      // const result = await sendExpiryEmail({
      //   to: cert.employee.email,
      //   employeeName: cert.employee.fullName,
      //   certCN: cert.subjectCN,
      //   validTo: cert.validTo,
      //   daysLeft: days,
      // });

      await notificationLogService.create({
        certificateId: certificate.id,
        sentTo: certificate.employee.email,
        daysBeforeExpiry: day,
        status: 'sent',
        errorMessage: null,
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

  console.log(`✅ Marked ${updated.count} certificates as expired`);
}