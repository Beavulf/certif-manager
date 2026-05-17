'use server'

import { uploadDocumentSchema } from "@/schemas/upload-file-schema"
import { auditlogService } from "@/server/services/auditlog-service";
import { documentService } from "@/server/services/document-service";
import type { SafeResult } from "@/types/safe-result-types";

export default async function uploadDocumentAction(
  formData: FormData,
  adUsername: string
):Promise<SafeResult> {

  const parsed = uploadDocumentSchema.safeParse({
    certificateId: formData.get("certificateId"),
    file: formData.get("file")
  })
  
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const { certificateId, file } = parsed.data;
  const buffer = Buffer.from(await file.arrayBuffer())

  const document = await documentService.create(
    certificateId,
    buffer,
    file.fileType,
    file.name,
    adUsername,
  )

  try {
    await auditlogService.log({
      adUsername: adUsername,
      action: "uploadDoc",
      entityType: 'document',
      entityId: document.id,
      displayName: `Файл загружен: ${document.fileName}`,
    })
  } catch {}

  return { success: true, data: document.id }
}