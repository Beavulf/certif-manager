import { auditLogRepository } from "../repositories/auditlog-repository";
import type { Prisma, AuditLog } from "@/generated/prisma/client";
import { BadRequestError } from "../errors/app-error";
import type { AuditLogsWithIncludes } from "@/types/auditlog-types";

export const auditlogService = {
  async log(data: Prisma.AuditLogCreateInput): Promise<AuditLog> {
    if (!data.action) {
      throw new BadRequestError("Отсутствуют обязательные поля для создания лога");
    }
    return await auditLogRepository.create(data);
  },

  async findMany(
    args?: Prisma.AuditLogFindManyArgs
  ):Promise<AuditLogsWithIncludes[]> {
    const auditLogs = await auditLogRepository.findMany(args);
    return auditLogs;
  },
}