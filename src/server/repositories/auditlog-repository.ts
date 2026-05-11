import prisma from "@/lib/prisma";
import type { Prisma, PrismaClient, AuditLog } from "@/generated/prisma/client";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function createAuditLogRepository(db: DbClient = prisma) {
  return {
    create(data: Prisma.AuditLogCreateInput): Promise<AuditLog> {
      return db.auditLog.create({ data });
    },

    findById(id: string): Promise<AuditLog | null> {
      return db.auditLog.findUnique({ where: { id } });
    },

    updateById(id: string, data: Prisma.AuditLogUpdateInput): Promise<AuditLog> {
      return db.auditLog.update({ where: { id }, data });
    },

    deleteById(id: string): Promise<AuditLog> {
      return db.auditLog.delete({ where: { id } });
    },
  } as const;
}

export const auditLogRepository = createAuditLogRepository();