import type { AuditLog, User } from "@/generated/prisma/client"

export type AuditLogsWithIncludes = AuditLog & {
  user?: User
}