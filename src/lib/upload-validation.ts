import { FileType } from '@/generated/prisma/client';
import {
  getUploadLimitsFromSettings,
  validateCertificateFile,
  validateDocumentFile,
} from '@/lib/app-settings-helpers';
import { appSettingsService } from '@/server/services/app-settings-service';
import { resolveDocumentFileType } from '@/schemas/upload-file-schema';

export async function validateCertificateUpload(file: File): Promise<string | null> {
  const settings = await appSettingsService.getOrCreate();
  return validateCertificateFile(file, getUploadLimitsFromSettings(settings));
}

export async function validateDocumentUpload(
  file: File,
): Promise<{ error: string } | { fileType: FileType }> {
  const settings = await appSettingsService.getOrCreate();
  const limits = getUploadLimitsFromSettings(settings);
  const error = validateDocumentFile(file, limits);
  if (error) return { error };

  const fileType = resolveDocumentFileType(file.name);
  if (!fileType) {
    return { error: 'Недопустимый тип документа' };
  }

  return { fileType };
}
