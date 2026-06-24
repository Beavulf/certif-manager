import prisma from "@/lib/prisma";
import type { Prisma, PrismaClient, Certificate } from "@/generated/prisma/client";
import type { CertificateFindManyArgs, CertificateGetPayload } from "@/generated/prisma/models";
import { handlePrismaError } from "../errors/prisma-error-handler";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function createCertificateRepository(db: DbClient = prisma) {
  return {

    async create(data: Prisma.CertificateCreateInput): Promise<Certificate> {
      try {
        return await db.certificate.create({ data });
      } catch(error) {
        handlePrismaError(error)
      }
    },

    async findById(id: string): Promise<Certificate | null> {
      try {
        return await db.certificate.findUnique({ where: { id } });
      } catch(error) {
        handlePrismaError(error)
      }
    },

    async findByIdWithRelations(id: string) {
      try {
        return await db.certificate.findUnique({
          where: { id },
          include: {
            employee: true,
            documents: true,
          },
        });
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async findBySerialNumber(serialNumber: string): Promise<Certificate | null> {
      try {
        return await db.certificate.findUnique({ where: { serialNumber } });
      } catch(error) {
        handlePrismaError(error)
      }
    },

    async findMany<T extends CertificateFindManyArgs>(
      args?: Prisma.SelectSubset<T, CertificateFindManyArgs>
    ):Promise<CertificateGetPayload<T>[]> {
      try {
        return await db.certificate.findMany<T>(args);
      } catch(error) {
        handlePrismaError(error)
      }
    },

    async updateById(id: string, data: Prisma.CertificateUpdateInput): Promise<Certificate> {
      try {
        return await db.certificate.update({ where: { id }, data });
      } catch(error) {
        handlePrismaError(error)
      }
    },

    async updateMany(args: Prisma.CertificateUpdateManyArgs): Promise<Prisma.BatchPayload> {
      try {
        return await db.certificate.updateMany(args);
      } catch(error) {
        handlePrismaError(error)
      }
    },

    async deleteById(id: string): Promise<Certificate> {
      try {
        return await db.certificate.delete({ where: { id } });
      } catch(error) {
        handlePrismaError(error)
      }
    },
  } as const;
}

export const certificateRepository = createCertificateRepository();