'use server'

import type { Certificate } from "@/generated/prisma/browser";
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { auditlogService } from "@/server/services/auditlog-service";
import { certificateService } from "@/server/services/certificate-service";
import type { SafeResult } from "@/types/safe-result-types";
import {z} from 'zod'

const deleteCertificateSchema = z.object({
  id: z.string({ error: 'id обязателен' })
    .min(1, 'id не может быть пустым')
    .uuid()
})

export default async function deleteCertificateAction(
  id: string
):Promise<SafeResult<Certificate>> {
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
    await auditlogService.log({
      action: 'deleteCert',
      entityType: 'certificate',
      entityId: certificate.id,
      displayName: `Сертификат удален: ${certificate.serialNumber} - ${certificate.subjectCN}. Документы удалены: ${deletedDocs.count} шт.`,
      adUsername: certificate.uploadedBy
    })
    return {
      success: true,
      data: certificate
    }
  } catch(error) {
    return mapErrorToSafeResult(error);
  }
}