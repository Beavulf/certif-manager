import { getDocumentByFilterSchema, getDocumentByIdSchema } from "@/schemas/get-document-schema"
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { documentService } from "@/server/services/document-service";

export async function getDocumentsByCertIdAction(
  certificateId: string
) {
  const parsed = getDocumentByIdSchema.safeParse({ 
    id: certificateId
  })
  
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors
    }  
  }

  const { id } = parsed.data;

  try {
    const documents = await documentService.findByCertificateId(id);
    return { success: true, data: documents }
  } catch(error) {
    return mapErrorToSafeResult(error)
  }
}

export async function getDocumentsByIdAction(
  documentId: string
) {
  const parsed = getDocumentByIdSchema.safeParse({ 
    id: documentId
  })
  
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors
    }  
  }

  const { id } = parsed.data;

  try {
    const documents = await documentService.findById(id);
    return { success: true, data: documents }
  } catch(error) {
    return mapErrorToSafeResult(error)
  }
}

export async function getDocumentsByFilterAction(
  formData: FormData
) {
  const filterKeys = ["fileKey", "fileName", "fileType", "uploadedBy"];
  const filterData = Object.fromEntries(
    filterKeys.map((key) => [key, formData.get(key)])
  );

  const parsed = getDocumentByFilterSchema.safeParse({ filterData })
  
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors
    }  
  }

  const where = Object.fromEntries(
    Object.entries(parsed.data).filter(([_, v]) => v != null && v !== "")
  );

  try {
    const documents = await documentService.findMany({
      where,
      include: {
        certificate: true
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    });
    
    return { success: true, data: documents }
  } catch(error) {
    return mapErrorToSafeResult(error)
  }
}