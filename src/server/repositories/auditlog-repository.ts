import prisma from "@/lib/prisma";
import type { Prisma, PrismaClient, AuditLog } from "@/generated/prisma/client";
import { handlePrismaError } from "../errors/prisma-error-handler";
import type { AuditLogFindManyArgs, AuditLogGetPayload } from "@/generated/prisma/models";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function createAuditLogRepository(db: DbClient = prisma) {
  return {
    async create(data: Prisma.AuditLogCreateInput): Promise<AuditLog> {
      try {
        return await db.auditLog.create({ data });
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async findMany<T extends AuditLogFindManyArgs>(
      args?: Prisma.SelectSubset<T, AuditLogFindManyArgs>
    ):Promise<AuditLogGetPayload<T>[]> {
      try {
        return await db.auditLog.findMany<T>(args);
      } catch(error) {
        handlePrismaError(error)
      }
    },

    async findById(id: string): Promise<AuditLog | null> {
      try {
        return await db.auditLog.findUnique({ where: { id } });
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async deleteById(id: string): Promise<AuditLog> {
      try {
        return await db.auditLog.delete({ where: { id } });
      } catch (error) {
        handlePrismaError(error);
      }
    },
  } as const;
}

export const auditLogRepository = createAuditLogRepository();