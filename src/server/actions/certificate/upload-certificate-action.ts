'use server'

import { uploadCertificateSchema } from "@/schemas/upload-file-schema"
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { auditlogService } from "@/server/services/auditlog-service";
import { certificateService } from "@/server/services/certificate-service";
import type { SafeResult } from "@/types/safe-result-types";
import { requireAuth } from "@/lib/session-helper";
import type { Certificate } from "@/generated/prisma/browser";

export default async function uploadCertificateToEmployeeAction(
  formData: FormData,
):Promise<SafeResult<Certificate | unknown>> {
  const session = await requireAuth();
  const username = session?.username;

  if (!username) {
    return {
      success: false,
      error: 'Ошибка получения имени пользователя',
      code: 'UNAUTHORIZED',
      fieldErrors: {}
    }
  }
  
  const parsed = uploadCertificateSchema.safeParse({
    employeeId: formData.get("employeeId") || undefined,
    file: formData.get("file"),
    notes: formData.get("notes") || undefined
  })
  
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: fields,
    }
  }

  try {
    const { employeeId, file, notes } = parsed.data;
    const buffer = Buffer.from(await file.arrayBuffer())
    
    const certificate = await certificateService.create({
      employeeId,
      fileName: file.name,
      uploadedBy: username,
      fileType: file.type,
      fileBuffer: buffer,
      notes: notes
    })
  
    await auditlogService.log({
      action: 'uploadCert',
      entityType: 'certificate',
      entityId: certificate.id,
      displayName: `Сертификат загружен: ${certificate.serialNumber}`,
      adUsername: username
    })
  
    return { success: true, data: certificate }
  } catch(error) {
    return mapErrorToSafeResult(error)
  }
}