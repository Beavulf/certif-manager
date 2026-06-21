import type { Prisma } from '@/generated/prisma/client';
import type { NotificationLogsQuery } from '@/schemas/notifications-schema';

function getPeriodStart(period: NotificationLogsQuery['period']): Date | null {
  if (period === 'all') return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (period === '7d') {
    start.setDate(start.getDate() - 7);
    return start;
  }

  if (period === '30d') {
    start.setDate(start.getDate() - 30);
    return start;
  }

  return start;
}

export function buildNotificationLogsWhere(
  query: Pick<NotificationLogsQuery, 'search' | 'status' | 'period'>,
): Prisma.NotificationLogWhereInput {
  const conditions: Prisma.NotificationLogWhereInput[] = [];

  if (query.status !== 'all') {
    conditions.push({ status: query.status });
  }

  const periodStart = getPeriodStart(query.period);
  if (periodStart) {
    conditions.push({ sentAt: { gte: periodStart } });
  }

  if (query.search) {
    conditions.push({
      OR: [
        { sentTo: { contains: query.search, mode: 'insensitive' } },
        {
          certificate: {
            subjectCN: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          certificate: {
            subjectEmail: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          certificate: {
            serialNumber: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          certificate: {
            employee: {
              fullName: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
      ],
    });
  }

  if (conditions.length === 0) return {};

  return { AND: conditions };
}

export type NotificationStats = {
  total: number;
  sent: number;
  failed: number;
  today: number;
};

export function getTodayStart(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}
