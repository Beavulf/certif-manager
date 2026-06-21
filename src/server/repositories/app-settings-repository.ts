import prisma from '@/lib/prisma';
import type { AppSettings, Prisma, PrismaClient } from '@/generated/prisma/client';
import { handlePrismaError } from '../errors/prisma-error-handler';

export type DbClient = PrismaClient | Prisma.TransactionClient;

export const APP_SETTINGS_ID = 'default';

export function createAppSettingsRepository(db: DbClient = prisma) {
  return {
    async findById(id: string = APP_SETTINGS_ID): Promise<AppSettings | null> {
      try {
        return await db.appSettings.findUnique({ where: { id } });
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async create(data: Prisma.AppSettingsCreateInput): Promise<AppSettings> {
      try {
        return await db.appSettings.create({ data });
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async updateById(
      id: string,
      data: Prisma.AppSettingsUpdateInput,
    ): Promise<AppSettings> {
      try {
        return await db.appSettings.update({ where: { id }, data });
      } catch (error) {
        handlePrismaError(error);
      }
    },
  } as const;
}

export const appSettingsRepository = createAppSettingsRepository();
