import type { Certificate, NotificationLog } from "@/generated/prisma/client"

export type NotificationLogWithIncludes = NotificationLog & {
  certificate?: Certificate
}