'use server'

import { uploadCertificateSchema } from "@/schemas/upload-certificate-schema"
import { auditlogService } from "@/server/services/auditlog-service";
import { certificateService } from "@/server/services/certificate-service";

export default async function uploadCertificateAction(formData: FormData) {
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
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
  
    const certificate = await certificateService.create(
      employeeId,
      file.name,
      "admin",
      file.type,
      buffer,
    )

    await auditlogService.log({
      action: "uploadCert",
      entityType: 'certificate',
      entityId: certificate.id,
      displayName: `Сертификат загружен: ${certificate.serialNumber}`
    })

    return { success: true, data: certificate }
  } catch(error) {
    return { success: false, error: 'Ошибка сервера', fieldErrors: {} }
  }
}