'use server'

import { uploadCertificateSchema } from "@/schemas/upload-file-schema"
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { auditlogService } from "@/server/services/auditlog-service";
import { certificateService } from "@/server/services/certificate-service";
import type { SafeResult } from "@/types/safe-result-types";
import { getSessionUser } from "@/lib/session-helper";

export default async function uploadCertificateToEmployeeAction(
  formData: FormData,
  adUsername: string
):Promise<SafeResult> {
  const session = await getSessionUser();
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
    employeeId: formData.get("employeeId"),
    file: formData.get("file"),
    notes: formData.get("notes")
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
  
    const certificate = await certificateService.create(
      employeeId,
      file.name,
      username,
      file.type,
      buffer,
      notes
    )
  
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