import { Readable } from 'node:stream';

import { NextResponse } from 'next/server';

import { getObjectStat, getObjectStream } from '@/minio/minio';

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*\x00-\x1f]+/g, '_').trim() || 'download';
}

function contentDisposition(fileName: string): string {
  const safeName = sanitizeFileName(fileName);
  const encoded = encodeURIComponent(safeName);
  return `attachment; filename="${safeName}"; filename*=UTF-8''${encoded}`;
}

export async function createFileDownloadResponse(
  fileKey: string,
  fileName: string,
): Promise<NextResponse> {
  // Последовательно: stat → stream. При параллельном Promise.all падение одного
  // запроса оставляло второй открытый S3-поток незакрытым (утечка сокета).
  const stat = await getObjectStat(fileKey);
  const stream = await getObjectStream(fileKey);

  const contentType =
    stat.metaData?.['content-type'] ??
    stat.metaData?.['Content-Type'] ??
    'application/octet-stream';

  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition(fileName),
      'Cache-Control': 'private, no-store',
      ...(stat.size ? { 'Content-Length': String(stat.size) } : {}),
    },
  });
}
