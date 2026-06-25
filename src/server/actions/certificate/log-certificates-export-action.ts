'use server';

import { z } from 'zod';

import { requireAuth } from '@/lib/session-helper';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { AUDIT_ENTITY } from '@/types/auditlog-types';
import type { SafeResult } from '@/types/safe-result-types';

const exportAuditSchema = z.object({
  count: z.number().int().min(0),
  preset: z.string().optional(),
  selectedOnly: z.boolean().optional(),
});

export async function logCertificatesExportAction(input: {
  count: number;
  preset?: string;
  selectedOnly?: boolean;
}): Promise<SafeResult<void>> {
  const session = await requireAuth();
  const parsed = exportAuditSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { count, preset, selectedOnly } = parsed.data;
    const scope = selectedOnly
      ? 'выбранные'
      : preset
        ? `фильтр «${preset}»`
        : 'текущая выборка';

    await auditlogService.log({
      action: 'exportReport',
      entityType: AUDIT_ENTITY.certificate,
      displayName: `Экспорт сертификатов (${scope}): ${count} записей`,
      adUsername: session.username,
    });

    return { success: true, data: undefined };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
