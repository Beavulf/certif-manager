import {
  getExpiryUrgency,
  STATUS_LABELS,
  type ExpiryThresholds,
} from '@/lib/certificate-expiry';
import type { CertificatesWithIncludes } from '@/types/certificate-types';

export const CERTIFICATE_PRESETS = [
  {
    id: 'active',
    label: 'Активны',
    description: 'Действующий сертификат без угрозы истечения',
  },
  {
    id: 'expiring',
    label: 'Скоро истекают',
    description: 'Истекают в ближайшие дни по порогам системы',
  },
  {
    id: 'expired',
    label: 'Истёкшие',
    description: 'Срок действия закончился',
  },
  {
    id: 'revoked',
    label: 'Отозваны',
    description: 'Отозваны или аннулированы',
  },
  {
    id: 'unassigned',
    label: 'Без сотрудника',
    description: 'Не привязаны к карточке сотрудника',
  },
  {
    id: 'no-docs',
    label: 'Без документов',
    description: 'Нет прикреплённых файлов',
  },
] as const;

export type CertificatePresetId = (typeof CERTIFICATE_PRESETS)[number]['id'];

export function isCertificatePresetId(value: string | null): value is CertificatePresetId {
  return CERTIFICATE_PRESETS.some((preset) => preset.id === value);
}

function getDocumentCount(cert: CertificatesWithIncludes): number {
  if (cert._count?.documents != null) {
    return cert._count.documents;
  }
  return cert.documents?.length ?? 0;
}

export function applyCertificatePreset(
  data: CertificatesWithIncludes[],
  preset: CertificatePresetId | null,
  thresholds: ExpiryThresholds,
): CertificatesWithIncludes[] {
  if (!preset) return data;

  switch (preset) {
    case 'active':
      return data.filter((cert) => getExpiryUrgency(cert, thresholds) === 'active');
    case 'expiring':
      return data.filter((cert) => {
        const urgency = getExpiryUrgency(cert, thresholds);
        return urgency === 'warning' || urgency === 'critical';
      });
    case 'expired':
      return data.filter((cert) => getExpiryUrgency(cert, thresholds) === 'expired');
    case 'revoked':
      return data.filter((cert) => getExpiryUrgency(cert, thresholds) === 'revoked');
    case 'unassigned':
      return data.filter((cert) => !cert.employeeId);
    case 'no-docs':
      return data.filter((cert) => getDocumentCount(cert) === 0);
    default:
      return data;
  }
}

export function countByPreset(
  data: CertificatesWithIncludes[],
  thresholds: ExpiryThresholds,
): Record<CertificatePresetId, number> {
  return {
    active: applyCertificatePreset(data, 'active', thresholds).length,
    expiring: applyCertificatePreset(data, 'expiring', thresholds).length,
    expired: applyCertificatePreset(data, 'expired', thresholds).length,
    revoked: applyCertificatePreset(data, 'revoked', thresholds).length,
    unassigned: applyCertificatePreset(data, 'unassigned', thresholds).length,
    'no-docs': applyCertificatePreset(data, 'no-docs', thresholds).length,
  };
}

export function getPresetLabel(preset: CertificatePresetId): string {
  return CERTIFICATE_PRESETS.find((item) => item.id === preset)?.label ?? preset;
}

export { STATUS_LABELS };
