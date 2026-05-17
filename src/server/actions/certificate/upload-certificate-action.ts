'use server'

import { uploadCertificateSchema } from "@/schemas/upload-file-schema"
import { auditlogService } from "@/server/services/auditlog-service";
import { certificateService } from "@/server/services/certificate-service";
import type { SafeResult } from "@/types/safe-result-types";

export default async function uploadCertificateAction(
  formData: FormData,
  adUsername: string
):Promise<SafeResult> {
  const parsed = uploadCertificateSchema.safeParse({
    employeeId: formData.get("employeeId"),
    file: formData.get("file")
  })
  
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: fields,
    }
  }

  const { employeeId, file } = parsed.data;

  const buffer = Buffer.from(await file.arrayBuffer())

  const certificate = await certificateService.create(
    employeeId,
    file.name,
    adUsername,
    file.type,
    buffer,
  )

  try {
    await auditlogService.log({
      action: "uploadCert",
      entityType: 'certificate',
      entityId: certificate.id,
      displayName: `Сертификат загружен: ${certificate.serialNumber}`,
      adUsername: adUsername
    })
  } catch {}

  return { success: true, data: certificate }
}