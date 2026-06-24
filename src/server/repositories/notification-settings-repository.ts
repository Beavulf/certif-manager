import prisma from "@/lib/prisma";
import type { Prisma, PrismaClient, NotificationSettings } from "@/generated/prisma/client";
import { handlePrismaError } from "../errors/prisma-error-handler";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function createNotificationSettingsRepository(db: DbClient = prisma) {
  return {
    async create(data: Prisma.NotificationSettingsCreateInput): Promise<NotificationSettings> {
      try {
        return await db.notificationSettings.create({ data });
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async findFirst(
      args?: Prisma.NotificationSettingsFindFirstArgs
    ): Promise<NotificationSettings | null> {
      try {
        return await db.notificationSettings.findFirst(args);
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async updateById(id: string, data: Prisma.NotificationSettingsUpdateInput): Promise<NotificationSettings> {
      try {
        return await db.notificationSettings.update({ where: { id }, data });
      } catch (error) {
        handlePrismaError(error);
      }
    },
  } as const;
}

export const notificationSettingsRepository = createNotificationSettingsRepository();
