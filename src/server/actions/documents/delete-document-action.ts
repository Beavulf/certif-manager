import { getDocumentByIdSchema } from "@/schemas/get-document-schema";
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { documentService } from "@/server/services/document-service";

export async function deleteDocumentByIdAction(
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
    const document = await documentService.deleteById(id);
    return { success: true, data: document }
  } catch(error) {
    return mapErrorToSafeResult(error)
  }
}