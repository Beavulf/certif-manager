import type { Certificate, Employee, NotificationLog, Prisma, Document, CertStatus } from "@/generated/prisma/client";

export interface GetCertificateOptions {
  filter?: Prisma.CertificateWhereInput;
  orderBy?: Prisma.CertificateOrderByWithRelationInput | Prisma.CertificateOrderByWithRelationInput[];
  include?: Prisma.CertificateInclude;
  skip?: number;
  take?: number;
  includeEmployee?: boolean;
  includeNotificationLog?: boolean;
  includeDocuments?: boolean;
}

export type CertificatesWithIncludes = Certificate & {
  employee?: Employee,
  documents?: Document[],
  notificationLog?: NotificationLog
}