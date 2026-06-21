'use server';

import { uploadDocumentSchema } from '@/schemas/upload-file-schema';
import { requireAuth } from '@/lib/session-helper';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { documentService } from '@/server/services/document-service';
import type { SafeResult } from '@/types/safe-result-types';
import type { Document } from '@/generated/prisma/client';
import { validateDocumentUpload } from '@/lib/upload-validation';

export default async function uploadDocumentAction(
  formData: FormData,
): Promise<SafeResult<Document>> {
  const session = await requireAuth();
  const username = session?.username;

  if (!username) {
    return {
      success: false,
      error: 'Ошибка получения имени пользователя',
      code: 'UNAUTHORIZED',
      fieldErrors: {},
    };
  }

  const parsed = uploadDocumentSchema.safeParse({
    certificateId: formData.get('certificateId'),
    file: formData.get('file'),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const validation = await validateDocumentUpload(parsed.data.file);
  if ('error' in validation) {
    return {
      success: false,
      error: validation.error,
      fieldErrors: { file: [validation.error] },
    };
  }

  try {
    const { certificateId, file } = parsed.data;
    const { fileType } = validation;
    const buffer = Buffer.from(await file.arrayBuffer());

    const document = await documentService.create(
      certificateId,
      buffer,
      fileType,
      file.name,
      username,
    );

    await auditlogService.log({
      adUsername: username,
      action: 'uploadDoc',
      entityType: 'document',
      entityId: document.id,
      displayName: `Файл загружен: ${document.fileName}`,
    });

    return { success: true, data: document };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
