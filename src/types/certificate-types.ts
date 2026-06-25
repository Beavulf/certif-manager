import type { Certificate, Employee, NotificationLog, Prisma, Document } from "@/generated/prisma/client";
import { Prisma as PrismaBrowser } from "@/generated/prisma/browser";

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
  employee?: Employee | null,
  documents?: Document[],
  notificationLog?: NotificationLog
  _count?: { documents: number },
}

export const CertificateFields =  PrismaBrowser.CertificateScalarFieldEnum;