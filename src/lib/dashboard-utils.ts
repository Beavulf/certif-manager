import type { Certificate } from '@/generated/prisma/client';
import {
  daysUntilExpiry,
  getExpiryUrgency,
  type ExpiryThresholds,
  type ExpiryUrgency,
} from '@/lib/certificate-expiry';
import type {
  DashboardAttentionCert,
  DashboardKpi,
} from '@/types/dashboard-types';
import type { CertificatesWithIncludes } from '@/types/certificate-types';

const URGENCY_ORDER: Record<ExpiryUrgency, number> = {
  expired: 0,
  critical: 1,
  warning: 2,
  revoked: 3,
  active: 4,
};

const ATTENTION_URGENCIES = new Set<ExpiryUrgency>([
  'expired',
  'critical',
  'warning',
]);

function holderKey(cert: CertificatesWithIncludes): string {
  if (cert.employeeId) {
    return `employee:${cert.employeeId}`;
  }
  return `subject:${cert.subjectCN.trim().toLowerCase()}`;
}

export function groupCertificatesByHolder(
  certificates: CertificatesWithIncludes[],
): Map<string, CertificatesWithIncludes[]> {
  const groups = new Map<string, CertificatesWithIncludes[]>();

  for (const cert of certificates) {
    const key = holderKey(cert);
    const list = groups.get(key) ?? [];
    list.push(cert);
    groups.set(key, list);
  }

  return groups;
}

/**
 * Для сотрудника (или ФИО без привязки) выбираем один «актуальный» сертификат:
 * - если есть действующий или скоро истекающий — с самой поздней датой validTo;
 * - иначе — последний истёкший (нет замены).
 */
export function pickRelevantCertificate(
  certs: CertificatesWithIncludes[],
  thresholds: ExpiryThresholds,
): CertificatesWithIncludes | null {
  if (certs.length === 0) return null;

  const ranked = certs
    .map((cert) => ({
      cert,
      urgency: getExpiryUrgency(cert, thresholds),
      validToMs: new Date(cert.validTo).getTime(),
    }))
    .filter((item) => item.urgency !== 'revoked');

  if (ranked.length === 0) return null;

  const operational = ranked.filter(
    (item) =>
      item.urgency === 'active' ||
      item.urgency === 'warning' ||
      item.urgency === 'critical',
  );

  if (operational.length > 0) {
    operational.sort((a, b) => b.validToMs - a.validToMs);
    return operational[0].cert;
  }

  ranked.sort((a, b) => b.validToMs - a.validToMs);
  return ranked[0].cert;
}

export function getRelevantCertificatesPerHolder(
  certificates: CertificatesWithIncludes[],
  thresholds: ExpiryThresholds,
): CertificatesWithIncludes[] {
  const groups = groupCertificatesByHolder(certificates);
  const result: CertificatesWithIncludes[] = [];

  for (const group of groups.values()) {
    const picked = pickRelevantCertificate(group, thresholds);
    if (picked) result.push(picked);
  }

  return result;
}

function toAttentionItem(
  cert: CertificatesWithIncludes,
  thresholds: ExpiryThresholds,
): DashboardAttentionCert {
  const urgency = getExpiryUrgency(cert, thresholds);

  let contextLabel: string | null = null;
  if (!cert.employeeId) {
    contextLabel = 'Не привязан к сотруднику';
  } else if (urgency === 'expired') {
    contextLabel = 'Нет действующего сертификата';
  } else if (urgency === 'critical' || urgency === 'warning') {
    contextLabel = 'Актуальный сертификат';
  }

  return {
    id: cert.id,
    subjectCN: cert.subjectCN,
    serialNumber: cert.serialNumber,
    validTo: cert.validTo,
    daysLeft: daysUntilExpiry(cert.validTo),
    urgency,
    employeeName: cert.employee?.fullName ?? null,
    contextLabel,
  };
}

export function buildAttentionCertificates(
  certificates: CertificatesWithIncludes[],
  thresholds: ExpiryThresholds,
  limit = 10,
): DashboardAttentionCert[] {
  const groups = groupCertificatesByHolder(certificates);
  const items: DashboardAttentionCert[] = [];

  for (const group of groups.values()) {
    const picked = pickRelevantCertificate(group, thresholds);
    if (!picked) continue;

    const urgency = getExpiryUrgency(picked, thresholds);
    if (!ATTENTION_URGENCIES.has(urgency)) continue;

    items.push(toAttentionItem(picked, thresholds));
  }

  return items
    .sort((a, b) => {
      const urgencyDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return a.daysLeft - b.daysLeft;
    })
    .slice(0, limit);
}

export function computeDashboardKpi(
  certificates: Certificate[],
  thresholds: ExpiryThresholds,
  notificationStats: {
    today: number;
    failed: number;
  },
): DashboardKpi {
  const relevant = getRelevantCertificatesPerHolder(
    certificates as CertificatesWithIncludes[],
    thresholds,
  );

  let expiringSoon = 0;
  let expired = 0;

  for (const cert of relevant) {
    const urgency = getExpiryUrgency(cert, thresholds);
    if (urgency === 'expired') expired += 1;
    if (urgency === 'warning' || urgency === 'critical') expiringSoon += 1;
  }

  return {
    totalCertificates: certificates.length,
    expiringSoon,
    expired,
    notificationsToday: notificationStats.today,
    notificationsFailed: notificationStats.failed,
  };
}
