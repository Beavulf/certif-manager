'use server';

import dayjs from '@/lib/dayjs-config';
import { requireAuth } from '@/lib/session-helper';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { certificateService } from '@/server/services/certificate-service';
import { AUDIT_ENTITY } from '@/types/auditlog-types';
import { revokeExpiredCertificatesSchema } from '@/schemas/revoke-expired-certificates-schema';
import type { SafeResult } from '@/types/safe-result-types';

export type RevokedExpiredCertificate = {
  id: string;
  serialNumber: string;
  subjectCN: string;
  validTo: Date;
};

export type RevokeExpiredReport = {
  revokedCount: number;
  certificates: RevokedExpiredCertificate[];
};

/**
 * Массовое аннулирование истёкших сертификатов.
 *
 * Сценарий: сотруднику загрузили новый сертификат, а старый (истёкший N дней
 * назад и больше) остаётся висеть в списках. Действие переводит все такие
 * сертификаты в статус «отозван»: они остаются в системе под фильтром
 * «Отозваны», но исчезают из активных списков, статистики и уведомлений.
 *
 * Аннулируются сертификаты со статусами active/expired (active — на случай,
 * если ночная синхронизация статусов ещё не успела пометить их как expired).
 */
export async function revokeExpiredCertificatesAction(input: {
  days: number;
}): Promise<SafeResult<RevokeExpiredReport>> {
  const session = await requireAuth();
  const username = session?.username;

  if (!username) {
    return {
      success: false,
      error: 'Ошибка получения имени пользователя',
      code: 'UNAUTHORIZED',
      fieldErrors: {},
    };
  }

  const parsed = revokeExpiredCertificatesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, unknown>,
    };
  }

  try {
    const { days } = parsed.data;

    // «Истёк ≥ days дней назад»: полночь дня истечения не позднее
    // (сегодня − days) — ровно та же арифметика, что в daysUntilExpiry.
    const cutoff = dayjs().startOf('day').subtract(days, 'day').add(1, 'day').toDate();

    const revoked = await certificateService.revokeExpiredBefore(cutoff);

    if (revoked.length > 0) {
      await auditlogService.log({
        action: 'editCertificate',
        entityType: AUDIT_ENTITY.certificate,
        displayName: `Массовое аннулирование истёкших сертификатов: ${revoked.length} шт. (истёкших ≥ ${days} дн.)`,
        adUsername: username,
      });
    }

    return {
      success: true,
      data: {
        revokedCount: revoked.length,
        certificates: revoked.map((certificate) => ({
          id: certificate.id,
          serialNumber: certificate.serialNumber,
          subjectCN: certificate.subjectCN,
          validTo: certificate.validTo,
        })),
      },
    };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
