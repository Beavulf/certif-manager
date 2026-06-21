import type { AppSettings } from '@/generated/prisma/client';
import {
  DEFAULT_EXPIRY_THRESHOLDS,
  DEFAULT_UPLOAD_LIMITS,
} from '@/lib/app-settings-defaults';

export type ExpiryThresholds = {
  warningDays: number;
  criticalDays: number;
};

export type UploadLimits = {
  maxFileSizeBytes: number;
  maxFileSizeMb: number;
  allowedCertTypes: string[];
  allowedDocTypes: string[];
};

export function getExpiryThresholdsFromSettings(
  settings?: Pick<AppSettings, 'warningDays' | 'criticalDays'> | null,
): ExpiryThresholds {
  return {
    warningDays: settings?.warningDays ?? DEFAULT_EXPIRY_THRESHOLDS.warningDays,
    criticalDays: settings?.criticalDays ?? DEFAULT_EXPIRY_THRESHOLDS.criticalDays,
  };
}

export function getUploadLimitsFromSettings(
  settings?: Pick<
    AppSettings,
    'maxFileSizeMb' | 'allowedCertTypes' | 'allowedDocTypes'
  > | null,
): UploadLimits {
  const maxFileSizeMb = settings?.maxFileSizeMb ?? DEFAULT_UPLOAD_LIMITS.maxFileSizeMb;
  return {
    maxFileSizeMb,
    maxFileSizeBytes: maxFileSizeMb * 1024 * 1024,
    allowedCertTypes:
      settings?.allowedCertTypes?.length
        ? settings.allowedCertTypes
        : [...DEFAULT_UPLOAD_LIMITS.allowedCertTypes],
    allowedDocTypes:
      settings?.allowedDocTypes?.length
        ? settings.allowedDocTypes
        : [...DEFAULT_UPLOAD_LIMITS.allowedDocTypes],
  };
}

export function validateCertificateFile(
  file: File,
  limits: UploadLimits,
): string | null {
  const lower = file.name.toLowerCase();
  const hasAllowedExt = limits.allowedCertTypes.some((ext) =>
    lower.endsWith(ext.toLowerCase()),
  );
  if (!hasAllowedExt) {
    return `Допустимы только ${limits.allowedCertTypes.join(', ')}`;
  }
  if (file.size === 0) return 'Файл пустой';
  if (file.size > limits.maxFileSizeBytes) {
    return `Файл превышает ${limits.maxFileSizeMb} МБ`;
  }
  return null;
}

export function validateDocumentFile(
  file: File,
  limits: UploadLimits,
): string | null {
  const lower = file.name.toLowerCase();
  const hasAllowedExt = limits.allowedDocTypes.some((ext) =>
    lower.endsWith(ext.toLowerCase()),
  );
  if (!hasAllowedExt) {
    return `Допустимы только ${limits.allowedDocTypes.join(', ')}`;
  }
  if (file.size === 0) return 'Файл пустой';
  if (file.size > limits.maxFileSizeBytes) {
    return `Файл превышает ${limits.maxFileSizeMb} МБ`;
  }
  return null;
}

export function getAdEmailDomain(
  settings?: Pick<AppSettings, 'adEmailDomain'> | null,
): string | undefined {
  return settings?.adEmailDomain?.trim() || process.env.AD_EMAIL_DOMAIN;
}
