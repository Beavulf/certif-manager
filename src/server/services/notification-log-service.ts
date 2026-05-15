import { NotFoundError } from "../errors/app-error";
import type { NotificationLogWithIncludes } from "@/types/notification-log-types";
import { notificationLogRepository } from "../repositories/notification-log-repository";
import type { NotificationLogCreateInput, NotificationLogFindManyArgs } from "@/generated/prisma/models";
import type { NotificationLog, Prisma } from "@/generated/prisma/client";
import { certificateService } from "./certificate-service";

export const notificationLogService = {

  async findMany(
    args?: NotificationLogFindManyArgs
  ):Promise<NotificationLogWithIncludes[]> {
    const certificates = await notificationLogRepository.findMany(args);
    return certificates;
  },

  async create(data: NotificationLogCreateInput):Promise<NotificationLog> {
    return await notificationLogRepository.create(data);
  },

  async findById(id: string):Promise<NotificationLog | null> {
    return await notificationLogRepository.findById(id);
  },

  async findFirst(args?: Prisma.NotificationLogFindFirstArgs):Promise<NotificationLog | null> {
    return await notificationLogRepository.findFirst(args);
  },

  async findByIdOrThrow(id: string):Promise<NotificationLog> {
    const notificationLog = await notificationLogRepository.findById(id);
    if (!notificationLog) {
      throw new NotFoundError("Сообщение об оповещении не найдено");
    }
    return notificationLog;
  },

  // создан ли уже лог для сертификата с определенным периодом
  async ensureAlreadySent(certificateId: string, days: number):Promise<NotificationLog | null> {
    const certificate = await certificateService.findByIdOrThrow(certificateId);
    const startOfToday = new Date();

    startOfToday.setHours(0, 0, 0, 0);

    const notifyLog = await notificationLogRepository.findFirst({ 
      where: { 
        certificateId: certificate.id,
        daysBeforeExpiry: days,
        sentAt: {
          gte: startOfToday
        },
        status: 'sent'
      } 
    });
    
    return notifyLog;
  },

  async getNotificationLogs(certificateId: string):Promise<NotificationLog[]> {
    const certificate = await this.findByIdOrThrow(certificateId);
    const notifyLog = await notificationLogRepository.findMany({
      where: {
        certificateId: certificate.id
      }
    });

    return notifyLog;
  },
}