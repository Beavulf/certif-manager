import path from 'path';

import { NextResponse } from 'next/server';

import { createFileDownloadResponse } from '@/lib/file-download-response';
import { getSessionUser } from '@/lib/session-helper';
import { mapErrorToResponse } from '@/server/errors/map-error';
import { certificateService } from '@/server/services/certificate-service';

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
    const certificate = await certificateService.findByIdOrThrow(id);
    const ext = path.extname(certificate.fileKey) || `.${certificate.certType}`;
    const safeName = certificate.subjectCN.replace(/[<>:"/\\|?*]+/g, '_').trim();
    const fileName = `${safeName}${ext}`;

    return await createFileDownloadResponse(certificate.fileKey, fileName);
  } catch (error) {
    return mapErrorToResponse(error);
  }
}
