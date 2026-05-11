import type { Certificate, Prisma } from "@/generated/prisma/client";

export interface GetCertificateOptions {
  filter?: Prisma.CertificateWhereInput;
  orderBy?: Prisma.CertificateOrderByWithRelationInput | Prisma.CertificateOrderByWithRelationInput[];
  include?: Prisma.CertificateInclude;
  skip?: number;
  take?: number;
}