'use server';

import { getDocumentByIdSchema } from '@/schemas/get-document-schema';
import { requireAuth } from '@/lib/session-helper';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { documentService } from '@/server/services/document-service';

export async function deleteDocumentByIdAction(documentId: string) {
  const session = await requireAuth();
  const username = session?.username;

  const parsed = getDocumentByIdSchema.safeParse({
    id: documentId,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const document = await documentService.deleteById(parsed.data.id);

    await auditlogService.log({
      adUsername: username,
      action: 'deleteDoc',
      entityType: 'document',
      entityId: document.id,
      displayName: `Файл удалён: ${document.fileName}`,
    });

    return { success: true, data: document };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
