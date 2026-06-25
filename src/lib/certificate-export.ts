import dayjs from '@/lib/dayjs-config';
import {
  getExpiryUrgency,
  STATUS_LABELS,
  URGENCY_LABELS,
  type ExpiryThresholds,
} from '@/lib/certificate-expiry';
import type { CertificatesWithIncludes } from '@/types/certificate-types';

const CSV_COLUMNS = [
  { key: 'subjectCN', header: 'ФИО (CN)' },
  { key: 'serialNumber', header: 'Серийный номер' },
  { key: 'subjectEmail', header: 'Email' },
  { key: 'employeeName', header: 'Сотрудник' },
  { key: 'issuer', header: 'Издатель' },
  { key: 'validFrom', header: 'Действует с' },
  { key: 'validTo', header: 'Истекает' },
  { key: 'status', header: 'Статус' },
  { key: 'urgency', header: 'Срочность' },
  { key: 'thumbprint', header: 'Отпечаток' },
  { key: 'uploadedBy', header: 'Кто добавил' },
  { key: 'uploadedAt', header: 'Загружен' },
  { key: 'notes', header: 'Примечание' },
] as const;

function escapeCsvCell(value: string): string {
  if (/[",\n\r;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  return dayjs(value).format('DD.MM.YYYY');
}

function certificateToRow(
  cert: CertificatesWithIncludes,
  thresholds: ExpiryThresholds,
): Record<(typeof CSV_COLUMNS)[number]['key'], string> {
  const urgency = getExpiryUrgency(cert, thresholds);

  return {
    subjectCN: cert.subjectCN ?? '',
    serialNumber: cert.serialNumber ?? '',
    subjectEmail: cert.subjectEmail ?? '',
    employeeName: cert.employee?.fullName ?? '',
    issuer: cert.issuer ?? '',
    validFrom: formatDate(cert.validFrom),
    validTo: formatDate(cert.validTo),
    status: STATUS_LABELS[cert.status] ?? cert.status,
    urgency: URGENCY_LABELS[urgency],
    thumbprint: cert.thumbprint ?? '',
    uploadedBy: cert.uploadedBy ?? '',
    uploadedAt: dayjs(cert.uploadedAt).format('DD.MM.YYYY HH:mm'),
    notes: cert.notes ?? '',
  };
}

export function buildCertificatesCsv(
  certificates: CertificatesWithIncludes[],
  thresholds: ExpiryThresholds,
): string {
  const header = CSV_COLUMNS.map((column) => escapeCsvCell(column.header)).join(';');
  const rows = certificates.map((cert) => {
    const row = certificateToRow(cert, thresholds);
    return CSV_COLUMNS.map((column) => escapeCsvCell(row[column.key])).join(';');
  });

  return `\uFEFF${[header, ...rows].join('\r\n')}`;
}

export function downloadCertificatesCsv(
  certificates: CertificatesWithIncludes[],
  thresholds: ExpiryThresholds,
  fileName?: string,
): void {
  const csv = buildCertificatesCsv(certificates, thresholds);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = dayjs().format('YYYY-MM-DD_HH-mm');
  link.href = url;
  link.download = fileName ?? `certificates_${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
