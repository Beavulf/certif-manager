'use server';

import { z } from 'zod';

import { requireAuth } from '@/lib/session-helper';
import { getPresignedUrl } from '@/minio/minio';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { documentService } from '@/server/services/document-service';
import type { SafeResult } from '@/types/safe-result-types';

const downloadSchema = z.object({
  documentId: z.string().uuid('Некорректный идентификатор документа'),
});

export type DocumentDownloadPayload = {
  url: string;
  fileName: string;
};

export async function getDocumentDownloadUrlAction(
  documentId: string,
): Promise<SafeResult<DocumentDownloadPayload>> {
  await requireAuth();

  const parsed = downloadSchema.safeParse({ documentId });
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const document = await documentService.findByIdOrThrow(parsed.data.documentId);
    const url = await getPresignedUrl(document.fileKey);

    return {
      success: true,
      data: { url, fileName: document.fileName },
    };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
