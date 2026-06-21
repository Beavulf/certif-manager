import { certificateService } from "@/server/services/certificate-service";
import { notificationLogService } from "@/server/services/notification-log-service";
import { notificationSettingsService } from "@/server/services/notification-settings-service";
import { sendExpiryEmail } from "./mail";
import { auditlogService } from "@/server/services/auditlog-service";
import dayjs from "@/lib/dayjs-config";
import type { CertificatesWithIncludes } from "@/types/certificate-types";
import type {
  CheckExpiringOptions,
  CheckExpiringResult,
} from "@/types/notification-check-types";

function normalizeDays(days: number[]): number[] {
  return [...new Set(days.map((d) => Math.trunc(d)))].sort((a, b) => b - a);
}

function getNotificationTarget(certificate: CertificatesWithIncludes) {
  const email =
    certificate.employee?.email?.trim() ||
    certificate.subjectEmail?.trim() ||
    null;

  if (!email) return null;

  return {
    email,
    name: certificate.employee?.fullName?.trim() || certificate.subjectCN,
  };
}

function formatSkipDetails(
  skippedAlreadySent: number,
  skippedNoRecipient: number,
): string {
  const parts: string[] = [];
  if (skippedAlreadySent > 0) {
    parts.push(`${skippedAlreadySent} уже отправлено сегодня`);
  }
  if (skippedNoRecipient > 0) {
    parts.push(
      `${skippedNoRecipient} без email (привяжите сотрудника или укажите subjectEmail)`,
    );
  }
  return parts.length ? ` (${parts.join('; ')})` : '';
}

export async function checkExpiringCertificates(
  options?: CheckExpiringOptions,
): Promise<CheckExpiringResult> {
  const notifySetting = await notificationSettingsService.getOrCreate();
  const isTestRun = options?.isTestRun ?? Boolean(options?.daysOverride?.length);

  if (!notifySetting.isEnabled) {
    await auditlogService.log({
      action: 'sendNotification',
      entityType: 'notificationSettings',
      displayName: 'Уведомления отключены, проверка сертификатов пропущена',
    });

    return {
      disabled: true,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      checkDays: [],
      isTestRun,
      message: 'Уведомления отключены в настройках',
    };
  }

  const checkDays = options?.daysOverride?.length
    ? normalizeDays(options.daysOverride)
    : normalizeDays(notifySetting.daysBeforeExpiry ?? [30, 14, 7]);

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skippedAlreadySent = 0;
  let skippedNoRecipient = 0;

  for (const day of checkDays) {
    const targetDay = dayjs().startOf('day').add(day, 'day');
    const from = targetDay.toDate();
    const to = targetDay.endOf('day').toDate();

    const certificates = await certificateService.findMany({
      where: {
        validTo: {
          gte: from,
          lte: to,
        },
        status: 'active',
      },
      include: {
        employee: true,
      },
    });

    if (!certificates.length) {
      continue;
    }

    for (const certificate of certificates) {
      if (!options?.ignoreAlreadySent) {
        const ensureAlreadySent = await notificationLogService.ensureAlreadySent(
          certificate.id,
          day,
        );

        if (ensureAlreadySent) {
          skippedAlreadySent += 1;
          continue;
        }
      }

      const target = getNotificationTarget(certificate);
      if (!target) {
        skippedNoRecipient += 1;
        continue;
      }

      processed += 1;

      const result = await sendExpiryEmail(
        {
          to: target.email,
          employeeName: target.name,
          certCN: certificate.subjectCN,
          validTo: certificate.validTo,
          daysLeft: day,
        },
        notifySetting,
      );

      if (result.success) {
        sent += 1;
      } else {
        failed += 1;
      }

      await notificationLogService.create({
        sentTo: target.email,
        daysBeforeExpiry: day,
        status: result.success ? 'sent' : 'failed',
        errorMessage: result.error ?? null,
        certificate: { connect: { id: certificate.id } },
      });
    }
  }

  const skipped = skippedAlreadySent + skippedNoRecipient;
  const skipDetails = formatSkipDetails(skippedAlreadySent, skippedNoRecipient);
  const daysLabel = checkDays.join(', ');
  const testPrefix = isTestRun ? `Тест (${daysLabel} дн.): ` : '';

  const message =
    processed === 0 && skipped === 0
      ? `${testPrefix}Нет сертификатов для уведомления (дни: ${daysLabel})`
      : `${testPrefix}Обработано: ${processed}, отправлено: ${sent}, ошибок: ${failed}, пропущено: ${skipped}${skipDetails}`;

  return {
    disabled: false,
    processed,
    sent,
    failed,
    skipped,
    checkDays,
    isTestRun,
    message,
  };
}

export async function updateExpiredStatuses() {
  const updated = await certificateService.updateMany({
    where: {
      validTo: { lt: new Date() },
      status: 'active',
    },
    data: { status: 'expired' },
  });

  if (updated.count !== 0) {
    await auditlogService.log({
      action: 'editCertificate',
      entityType: 'certificate',
      displayName: `Обновлено статусов certificates: ${updated.count}`,
    });
  }

  return updated.count;
}
