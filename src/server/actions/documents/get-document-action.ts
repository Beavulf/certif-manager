'use server';

import type { Document } from '@/generated/prisma/client';
import { getDocumentByIdSchema } from '@/schemas/get-document-schema';
import { requireAuth } from '@/lib/session-helper';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { documentService } from '@/server/services/document-service';
import type { SafeResult } from '@/types/safe-result-types';

export async function getDocumentsByCertIdAction(
  certificateId: string,
): Promise<SafeResult<Document[]>> {
  await requireAuth();

  const parsed = getDocumentByIdSchema.safeParse({
    id: certificateId,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const documents = await documentService.findByCertificateId(parsed.data.id);
    return { success: true, data: documents };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
