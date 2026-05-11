import prisma from "@/lib/prisma";
import type { Prisma, PrismaClient, NotificationSettings } from "@/generated/prisma/client";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function createNotificationSettingsRepository(db: DbClient = prisma) {
  return {
    create(data: Prisma.NotificationSettingsCreateInput): Promise<NotificationSettings> {
      return db.notificationSettings.create({ data });
    },

    findById(id: string): Promise<NotificationSettings | null> {
      return db.notificationSettings.findUnique({ where: { id } });
    },

    updateById(id: string, data: Prisma.NotificationSettingsUpdateInput): Promise<NotificationSettings> {
      return db.notificationSettings.update({ where: { id }, data });
    },

    deleteById(id: string): Promise<NotificationSettings> {
      return db.notificationSettings.delete({ where: { id } });
    },
  } as const;
}

export const notificationSettingsRepository = createNotificationSettingsRepository();