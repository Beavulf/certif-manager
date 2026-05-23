import { auditLogRepository } from "../repositories/auditlog-repository";
import type { Prisma, AuditLog } from "@/generated/prisma/client";
import type { AuditLogsWithIncludes } from "@/types/auditlog-types";

export const auditlogService = {
  async log(data: Prisma.AuditLogCreateInput): Promise<AuditLog | undefined> {
    try {
      return await auditLogRepository.create(data);
    } catch {}
  },

  async findMany(
    args?: Prisma.AuditLogFindManyArgs
  ):Promise<AuditLogsWithIncludes[]> {
    const auditLogs = await auditLogRepository.findMany(args);
    return auditLogs;
  },
}