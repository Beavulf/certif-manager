'use server'

import type { Certificate } from "@/generated/prisma/browser";
import { requireAuth } from "@/lib/session-helper";
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { auditlogService } from "@/server/services/auditlog-service";
import { certificateService } from "@/server/services/certificate-service";
import { AUDIT_ENTITY } from "@/types/auditlog-types";
import type { SafeResult } from "@/types/safe-result-types";
import {z} from 'zod'

const deleteCertificateSchema = z.object({
  id: z.string({ error: 'id обязателен' })
    .min(1, 'id не может быть пустым')
    .uuid()
})

export default async function deleteCertificateAction(
  id: string,
  options?: { skipAudit?: boolean },
):Promise<SafeResult<Certificate>> {
  const session = await requireAuth();
  const username = session.username;

  const parsed = deleteCertificateSchema.safeParse({ id })
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors
    }
  }
  
  try {
    const { deleted: certificate, deletedDocs } = await certificateService.deleteById(id);

    if (!options?.skipAudit) {
      await auditlogService.log({
        action: 'deleteCert',
        entityType: AUDIT_ENTITY.certificate,
        entityId: certificate.id,
        displayName: `Сертификат удалён: ${certificate.serialNumber} (${certificate.subjectCN}). Документов удалено: ${deletedDocs.count}`,
        adUsername: username,
      });
    }

    return {
      success: true,
      data: certificate
    }
  } catch(error) {
    return mapErrorToSafeResult(error);
  }
}
