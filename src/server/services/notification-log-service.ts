import { notificationLogRepository } from "../repositories/notification-log-repository";
import type { NotificationLogCreateInput } from "@/generated/prisma/models";
import type { NotificationLog, Prisma } from "@/generated/prisma/client";
import { certificateService } from "./certificate-service";
import {
  buildNotificationLogsWhere,
  getTodayStart,
  type NotificationStats,
} from "@/lib/notification-log-filters";
import type { NotificationLogsQuery } from "@/schemas/notifications-schema";

const certificateInclude = {
  certificate: {
    include: {
      employee: {
        select: {
          id: true,
          fullName: true,
          email: true,
          department: true,
        },
      },
    },
  },
} as const;

export const notificationLogService = {

  async count(args?: Prisma.NotificationLogCountArgs): Promise<number> {
    return notificationLogRepository.count(args);
  },

  async findPage(query: NotificationLogsQuery) {
    const where = buildNotificationLogsWhere(query);
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await Promise.all([
      notificationLogRepository.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: query.pageSize,
        include: certificateInclude,
      }),
      notificationLogRepository.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  },

  async getStats(): Promise<NotificationStats> {
    const todayStart = getTodayStart();

    const [total, sent, failed, today] = await Promise.all([
      notificationLogRepository.count(),
      notificationLogRepository.count({ where: { status: 'sent' } }),
      notificationLogRepository.count({ where: { status: 'failed' } }),
      notificationLogRepository.count({ where: { sentAt: { gte: todayStart } } }),
    ]);

    return { total, sent, failed, today };
  },

  async create(data: NotificationLogCreateInput): Promise<NotificationLog> {
    return await notificationLogRepository.create(data);
  },

  async ensureAlreadySent(certificateId: string, days: number): Promise<NotificationLog | null> {
    const certificate = await certificateService.findByIdOrThrow(certificateId);
    const startOfToday = new Date();

    startOfToday.setHours(0, 0, 0, 0);

    return notificationLogRepository.findFirst({ 
      where: { 
        certificateId: certificate.id,
        daysBeforeExpiry: days,
        sentAt: {
          gte: startOfToday
        },
        status: 'sent'
      } 
    });
  },

  async getNotificationLogs(certificateId: string): Promise<NotificationLog[]> {
    const certificate = await certificateService.findByIdOrThrow(certificateId);
    return notificationLogRepository.findMany({
      where: {
        certificateId: certificate.id
      }
    });
  },
}
