import type { CertStatus, Certificate } from '@/generated/prisma/client';
import dayjs from '@/lib/dayjs-config';

export type ExpiryUrgency = 'active' | 'warning' | 'critical' | 'expired' | 'revoked';

export type ExpiryThresholds = {
  warningDays: number;
  criticalDays: number;
};

export const DEFAULT_EXPIRY_THRESHOLDS: ExpiryThresholds = {
  warningDays: 30,
  criticalDays: 7,
};

export const STATUS_LABELS: Record<CertStatus, string> = {
  active: 'Активен',
  expired: 'Истёк',
  revoked: 'Отозван',
};

export function daysUntilExpiry(validTo: Date | string): number {
  return dayjs(validTo).startOf('day').diff(dayjs().startOf('day'), 'day');
}

export function getExpiryUrgency(
  cert: Pick<Certificate, 'status' | 'validTo'>,
  thresholds: ExpiryThresholds = DEFAULT_EXPIRY_THRESHOLDS,
): ExpiryUrgency {
  if (cert.status === 'revoked') return 'revoked';
  const days = daysUntilExpiry(cert.validTo);
  if (cert.status === 'expired' || days < 0) return 'expired';
  if (days <= thresholds.criticalDays) return 'critical';
  if (days <= thresholds.warningDays) return 'warning';
  return 'active';
}

export function getDaysLeftLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} дн. назад`;
  if (days === 0) return 'Сегодня';
  return `${days} дн.`;
}

export function getUrgencyRowClass(urgency: ExpiryUrgency): string {
  switch (urgency) {
    case 'expired':
      return 'cert-row-expired';
    case 'critical':
      return 'cert-row-critical';
    case 'warning':
      return 'cert-row-warning';
    case 'revoked':
      return 'cert-row-revoked';
    default:
      return 'cert-row-active';
  }
}

export function getUrgencyBadgeClass(urgency: ExpiryUrgency): string {
  switch (urgency) {
    case 'expired':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'critical':
      return 'border-orange-200 bg-orange-50 text-orange-700';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'revoked':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
}

export function getDaysLeftClass(urgency: ExpiryUrgency): string {
  switch (urgency) {
    case 'expired':
      return 'text-red-600';
    case 'critical':
      return 'text-orange-700';
    case 'warning':
      return 'text-amber-700';
    case 'revoked':
      return 'text-muted-foreground';
    default:
      return 'text-emerald-700';
  }
}
