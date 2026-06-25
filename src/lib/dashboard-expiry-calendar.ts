import dayjs from '@/lib/dayjs-config';
import { daysUntilExpiry } from '@/lib/certificate-expiry';
import type { CertificatesWithIncludes } from '@/types/certificate-types';
import type {
  DashboardExpiryCalendar,
  DashboardExpiryCalendarItem,
  DashboardExpiryCalendarWeek,
} from '@/types/dashboard-types';
import type { ExpiryThresholds } from '@/lib/certificate-expiry';

import { getRelevantCertificatesPerHolder } from './dashboard-utils';

const WEEKS_AHEAD = 4;

function toCalendarItem(cert: CertificatesWithIncludes): DashboardExpiryCalendarItem {
  return {
    id: cert.id,
    subjectCN: cert.subjectCN,
    employeeName: cert.employee?.fullName ?? null,
    validTo: cert.validTo,
    daysLeft: daysUntilExpiry(cert.validTo),
  };
}

function getWeekRanges(): { start: dayjs.Dayjs; end: dayjs.Dayjs; label: string }[] {
  const today = dayjs().startOf('day');
  const ranges: { start: dayjs.Dayjs; end: dayjs.Dayjs; label: string }[] = [];

  for (let i = 0; i < WEEKS_AHEAD; i++) {
    const start = today.add(i * 7, 'day');
    const end = start.add(6, 'day').endOf('day');
    const label =
      i === 0
        ? 'Эта неделя'
        : i === 1
          ? 'Следующая неделя'
          : `${start.format('D MMM')} – ${end.format('D MMM')}`;
    ranges.push({ start, end, label });
  }

  return ranges;
}

export function buildExpiryCalendar(
  certificates: CertificatesWithIncludes[],
  thresholds: ExpiryThresholds,
): DashboardExpiryCalendar {
  const relevant = getRelevantCertificatesPerHolder(certificates, thresholds);
  const weekRanges = getWeekRanges();
  const rangeEnd = weekRanges[weekRanges.length - 1].end;
  const today = dayjs().startOf('day');

  const expiring = relevant
    .filter((cert) => {
      const validTo = dayjs(cert.validTo);
      return (
        cert.status === 'active' &&
        !validTo.isBefore(today) &&
        !validTo.isAfter(rangeEnd)
      );
    })
    .map(toCalendarItem)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const weeks: DashboardExpiryCalendarWeek[] = weekRanges.map(({ start, end, label }) => {
    const items = expiring.filter((item) => {
      const validTo = dayjs(item.validTo);
      return !validTo.isBefore(start) && !validTo.isAfter(end);
    });

    return {
      weekStart: start.format('YYYY-MM-DD'),
      weekEnd: end.format('YYYY-MM-DD'),
      label,
      count: items.length,
      items,
    };
  });

  return {
    weeks,
    totalInRange: expiring.length,
  };
}
