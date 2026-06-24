'use server';

import { updateCertificateNotesSchema } from '@/schemas/update-certificate-notes-schema';
import { requireAuth } from '@/lib/session-helper';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { certificateService } from '@/server/services/certificate-service';
import { AUDIT_ENTITY } from '@/types/auditlog-types';
import type { Certificate } from '@/generated/prisma/client';
import type { SafeResult } from '@/types/safe-result-types';

export async function updateCertificateNotesAction(input: {
  certificateId: string;
  notes: string | null;
}): Promise<SafeResult<Certificate>> {
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

  const parsed = updateCertificateNotesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, unknown>,
    };
  }

  try {
    const certificate = await certificateService.updateNotes(
      parsed.data.certificateId,
      parsed.data.notes,
    );

    await auditlogService.log({
      action: 'editCertificate',
      entityType: AUDIT_ENTITY.certificate,
      entityId: certificate.id,
      displayName: `Обновлено примечание сертификата: ${certificate.serialNumber}`,
      adUsername: username,
    });

    return { success: true, data: certificate };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
