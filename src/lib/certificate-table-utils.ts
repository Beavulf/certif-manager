import type { Certificate } from '@/generated/prisma/client';
import type { CertificatesWithIncludes } from '@/types/certificate-types';
import { daysUntilExpiry, getExpiryUrgency, STATUS_LABELS, type ExpiryThresholds } from '@/lib/certificate-expiry';

export type CertificateGroupBy = 'none' | 'status' | 'issuer' | 'employee';

export type CertificateStats = {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
};

export type CertificateTableRow = CertificatesWithIncludes & {
  groupLabel?: string;
  groupCount?: number;
  isFirstInGroup?: boolean;
};

const GROUP_LABELS: Record<Exclude<CertificateGroupBy, 'none'>, string> = {
  status: 'Статус',
  issuer: 'Издатель',
  employee: 'Сотрудник',
};

const STATUS_GROUP_ORDER = ['Активен', 'Истёк', 'Отозван'];

export function computeCertificateStats(
  data: Certificate[],
  thresholds?: ExpiryThresholds,
): CertificateStats {
  return {
    total: data.length,
    active: data.filter((cert) => getExpiryUrgency(cert, thresholds) === 'active').length,
    expiringSoon: data.filter((cert) => {
      const urgency = getExpiryUrgency(cert, thresholds);
      return urgency === 'warning' || urgency === 'critical';
    }).length,
    expired: data.filter((cert) => getExpiryUrgency(cert, thresholds) === 'expired').length,
  };
}

function getGroupKey(cert: CertificatesWithIncludes, groupBy: CertificateGroupBy): string {
  switch (groupBy) {
    case 'status':
      return STATUS_LABELS[cert.status] ?? cert.status;
    case 'issuer':
      return cert.issuer?.trim() || 'Без издателя';
    case 'employee':
      return cert.employee?.fullName?.trim() || 'Без сотрудника';
    default:
      return '';
  }
}

function sortGroupKeys(keys: string[], groupBy: CertificateGroupBy): string[] {
  if (groupBy === 'status') {
    return [...keys].sort((a, b) => {
      const indexA = STATUS_GROUP_ORDER.indexOf(a);
      const indexB = STATUS_GROUP_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) {
        return a.localeCompare(b, 'ru', { sensitivity: 'base' });
      }
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }

  return [...keys].sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' }));
}

export function buildCertificateTableRows(
  data: CertificatesWithIncludes[],
  groupBy: CertificateGroupBy,
): CertificateTableRow[] {
  if (groupBy === 'none') {
    return [...data];
  }

  const groups = new Map<string, CertificatesWithIncludes[]>();

  for (const cert of data) {
    const key = getGroupKey(cert, groupBy);
    const bucket = groups.get(key);
    if (bucket) bucket.push(cert);
    else groups.set(key, [cert]);
  }

  const rows: CertificateTableRow[] = [];

  for (const label of sortGroupKeys([...groups.keys()], groupBy)) {
    const items = groups.get(label);
    if (!items?.length) continue;

    const sortedItems = [...items].sort(
      (a, b) => daysUntilExpiry(a.validTo) - daysUntilExpiry(b.validTo),
    );

    sortedItems.forEach((cert, index) => {
      rows.push({
        ...cert,
        groupLabel: index === 0 ? `${GROUP_LABELS[groupBy]}: ${label}` : undefined,
        groupCount: index === 0 ? items.length : undefined,
        isFirstInGroup: index === 0,
      });
    });
  }

  return rows;
}

export function isCertificateDataRow(
  row: CertificateTableRow,
): row is CertificateTableRow {
  return Boolean(row.id);
}
