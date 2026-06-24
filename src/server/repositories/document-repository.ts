import prisma from "@/lib/prisma";
import type { Prisma, PrismaClient, Document } from "@/generated/prisma/client";

export type DbClient = PrismaClient | Prisma.TransactionClient;

import { handlePrismaError } from "../errors/prisma-error-handler";

export function createDocumentRepository(db: DbClient = prisma) {
  return {
    async create(data: Prisma.DocumentCreateInput): Promise<Document> {
      try {
        return await db.document.create({ data });
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async findMany<T extends Prisma.DocumentFindManyArgs>(
      args?: Prisma.SelectSubset<T, Prisma.DocumentFindManyArgs>
    ): Promise<Prisma.DocumentGetPayload<T>[]> {
      try {
        return await db.document.findMany<T>(args);
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async findById(id: string): Promise<Document | null> {
      try {
        return await db.document.findUnique({ where: { id } });
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async deleteById(id: string): Promise<Document> {
      try {
        return await db.document.delete({ where: { id } });
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async getByCertificateId(certificateId: string): Promise<Document[]> {
      try {
        return await db.document.findMany({ where: { certificateId } });
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async deleteMany(args: Prisma.DocumentDeleteManyArgs): Promise<Prisma.BatchPayload> {
      try {
        return await db.document.deleteMany(args);
      } catch (error) {
        handlePrismaError(error);
      }
    }
  } as const;
}

export const documentRepository = createDocumentRepository();