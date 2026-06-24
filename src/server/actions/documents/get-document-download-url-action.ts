'use server';

import { z } from 'zod';

import { requireAuth } from '@/lib/session-helper';
import { getPresignedUrl } from '@/minio/minio';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { documentService } from '@/server/services/document-service';
import { AUDIT_ENTITY } from '@/types/auditlog-types';
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
  const session = await requireAuth();

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

    await auditlogService.log({
      action: 'viewCert',
      entityType: AUDIT_ENTITY.document,
      entityId: document.id,
      displayName: `Скачивание документа: ${document.fileName}`,
      adUsername: session.username,
    });

    return {
      success: true,
      data: { url, fileName: document.fileName },
    };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
