import type { AuditLog, User } from "@/generated/prisma/client"

export type AuditLogsWithIncludes = AuditLog & {
  user?: User
}

export const AUDIT_ENTITY = {
  certificate: 'certificate',
  document: 'document',
  employee: 'employee',
  notificationSettings: 'notificationSettings',
  appSettings: 'appSettings',
  system: 'system',
} as const

export type AuditEntityType = (typeof AUDIT_ENTITY)[keyof typeof AUDIT_ENTITY]