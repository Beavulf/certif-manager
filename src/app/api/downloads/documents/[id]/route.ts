import { NextResponse } from 'next/server';

import { createFileDownloadResponse } from '@/lib/file-download-response';
import { getSessionUser } from '@/lib/session-helper';
import { mapErrorToResponse } from '@/server/errors/map-error';
import { documentService } from '@/server/services/document-service';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const document = await documentService.findByIdOrThrow(id);

    return await createFileDownloadResponse(document.fileKey, document.fileName);
  } catch (error) {
    return mapErrorToResponse(error);
  }
}
