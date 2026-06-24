'use server';

import type { Certificate } from '@/generated/prisma/client';
import { requireAuth } from '@/lib/session-helper';
import { revokeCertificateSchema } from '@/schemas/revoke-certificate-schema';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { certificateService } from '@/server/services/certificate-service';
import { AUDIT_ENTITY } from '@/types/auditlog-types';
import type { SafeResult } from '@/types/safe-result-types';

export async function revokeCertificateAction(input: {
  certificateId: string;
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

  const parsed = revokeCertificateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, unknown>,
    };
  }

  try {
    const certificate = await certificateService.revoke(parsed.data.certificateId);

    await auditlogService.log({
      action: 'editCertificate',
      entityType: AUDIT_ENTITY.certificate,
      entityId: certificate.id,
      displayName: `Сертификат отозван: ${certificate.serialNumber} (${certificate.subjectCN})`,
      adUsername: username,
    });

    return { success: true, data: certificate };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
