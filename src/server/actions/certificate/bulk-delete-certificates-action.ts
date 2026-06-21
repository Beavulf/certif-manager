'use server';

import { z } from 'zod';

import { requireAuth } from '@/lib/session-helper';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import deleteCertificateAction from '@/server/actions/certificate/delete-certificate-action';
import type { SafeResult } from '@/types/safe-result-types';

const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().uuid('Некорректный идентификатор сертификата'))
    .min(1, 'Выберите хотя бы один сертификат')
    .max(100, 'Можно удалить не более 100 сертификатов за раз'),
});

export type BulkDeleteCertificatesResult = {
  deletedCount: number;
  failedIds: string[];
};

export async function bulkDeleteCertificatesAction(
  ids: string[],
): Promise<SafeResult<BulkDeleteCertificatesResult>> {
  const parsed = bulkDeleteSchema.safeParse({ ids });
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const uniqueIds = [...new Set(parsed.data.ids)];
  let deletedCount = 0;
  const failedIds: string[] = [];

  const session = await requireAuth();
  const username = session?.username;

  for (const id of uniqueIds) {
    const result = await deleteCertificateAction(id);
    if (result.success) {
      deletedCount += 1;
    } else {
      failedIds.push(id);
    }
  }

  if (deletedCount > 0) {
    await auditlogService.log({
      action: 'deleteCert',
      entityType: 'certificate',
      displayName: `Массовое удаление сертификатов: ${deletedCount} шт.`,
      adUsername: username,
    });
  }

  if (deletedCount === 0) {
    return {
      success: false,
      error: 'Не удалось удалить выбранные сертификаты',
      fieldErrors: {},
    };
  }

  return {
    success: true,
    data: { deletedCount, failedIds },
  };
}
