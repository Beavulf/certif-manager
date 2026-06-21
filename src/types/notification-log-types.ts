import type { Certificate, Employee, NotificationLog } from "@/generated/prisma/client"

export type NotificationLogEmployee = Pick<
  Employee,
  'id' | 'fullName' | 'email' | 'department'
>;

export type NotificationLogCertificate = Certificate & {
  employee?: NotificationLogEmployee | null;
};

export type NotificationLogWithIncludes = NotificationLog & {
  certificate?: NotificationLogCertificate;
};
