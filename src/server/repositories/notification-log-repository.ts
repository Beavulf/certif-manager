import prisma from "@/lib/prisma";
import type { Prisma, PrismaClient, NotificationLog } from "@/generated/prisma/client";
import type { NotificationLogCreateInput, NotificationLogFindManyArgs, NotificationLogGetPayload } from "@/generated/prisma/models";
import { handlePrismaError } from "../errors/prisma-error-handler";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function createNotificationLogRepository(db: DbClient = prisma) {
  return {

    async create(data: NotificationLogCreateInput): Promise<NotificationLog> {
      try {
        return await db.notificationLog.create({ data });
      } catch(error) {
        handlePrismaError(error)
      }
    },

    async findFirst(args?: Prisma.NotificationLogFindFirstArgs): Promise<NotificationLog | null> {
      try {
        return await db.notificationLog.findFirst(args);
      } catch(error) {
        handlePrismaError(error)
      }
    },

    async findMany<T extends NotificationLogFindManyArgs>(
      args?: Prisma.SelectSubset<T, NotificationLogFindManyArgs>
    ):Promise<NotificationLogGetPayload<T>[]> {
      try {
        return await db.notificationLog.findMany<T>(args);
      } catch(error) {
        handlePrismaError(error)
      }
    },

    async count(args?: Prisma.NotificationLogCountArgs): Promise<number> {
      try {
        return await db.notificationLog.count(args);
      } catch (error) {
        handlePrismaError(error);
      }
    },
  } as const;
}

export const notificationLogRepository = createNotificationLogRepository();