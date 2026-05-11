import prisma from "@/lib/prisma";
import type { Prisma, PrismaClient, NotificationLog } from "@/generated/prisma/client";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function createNotificationLogRepository(db: DbClient = prisma) {
  return {
    create(data: Prisma.NotificationLogCreateInput): Promise<NotificationLog> {
      return db.notificationLog.create({ data });
    },

    findById(id: string): Promise<NotificationLog | null> {
      return db.notificationLog.findUnique({ where: { id } });
    },

    findByCertId(certificateId: string): Promise<NotificationLog | null> {
      return db.notificationLog.findFirst({ where: { certificateId } });
    },

    updateById(id: string, data: Prisma.NotificationLogUpdateInput): Promise<NotificationLog> {
      return db.notificationLog.update({ where: { id }, data });
    },

    deleteById(id: string): Promise<NotificationLog> {
      return db.notificationLog.delete({ where: { id } });
    },
  } as const;
}

export const notificationLogRepository = createNotificationLogRepository();