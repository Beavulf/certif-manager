'use server';

import path from 'path';
import { z } from 'zod';

import { requireAuth } from '@/lib/session-helper';
import { getPresignedUrl } from '@/minio/minio';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { certificateService } from '@/server/services/certificate-service';
import type { SafeResult } from '@/types/safe-result-types';

const downloadSchema = z.object({
  certificateId: z.string().uuid('Некорректный идентификатор сертификата'),
});

export type CertificateDownloadPayload = {
  url: string;
  fileName: string;
};

export async function getCertificateDownloadUrlAction(
  certificateId: string,
): Promise<SafeResult<CertificateDownloadPayload>> {
  await requireAuth();

  const parsed = downloadSchema.safeParse({ certificateId });
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const certificate = await certificateService.findByIdOrThrow(parsed.data.certificateId);
    const url = await getPresignedUrl(certificate.fileKey);
    const ext = path.extname(certificate.fileKey) || `.${certificate.certType}`;
    const safeName = certificate.subjectCN.replace(/[<>:"/\\|?*]+/g, '_').trim();
    const fileName = `${safeName}${ext}`;

    return {
      success: true,
      data: { url, fileName },
    };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
