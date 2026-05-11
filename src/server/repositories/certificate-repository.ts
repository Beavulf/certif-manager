import prisma from "@/lib/prisma";
import type { Prisma, PrismaClient, Certificate } from "@/generated/prisma/client";
import type { GetCertificateOptions } from "@/types/certificate-types";
import type { CertificateInclude } from "@/generated/prisma/models";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function createCertificateRepository(db: DbClient = prisma) {
  return {

    getAllWithOptions(options?: GetCertificateOptions): Promise<(Certificate & CertificateInclude)[]> {
      const { filter, orderBy, include, skip, take } = options || {};
      return db.certificate.findMany({
        where: filter,
        orderBy,
        skip,
        take,
        include
      });
    },

    create(data: Prisma.CertificateCreateInput): Promise<Certificate> {
      return db.certificate.create({ data });
    },

    findById(id: string): Promise<Certificate | null> {
      return db.certificate.findUnique({ where: { id } });
    },

    findByEmployeeId(employeeId: string): Promise<Certificate | null> {
      return db.certificate.findFirst({ where: { employeeId } });
    },

    getDocuments(id: string) {
      return db.certificate.findUnique({ where: { id }, include: { documents: true } });
    },

    updateById(id: string, data: Prisma.CertificateUpdateInput): Promise<Certificate> {
      return db.certificate.update({ where: { id }, data });
    },

    deleteById(id: string): Promise<Certificate> {
      return db.certificate.delete({ where: { id } });
    },
  } as const;
}

export const certificateRepository = createCertificateRepository();