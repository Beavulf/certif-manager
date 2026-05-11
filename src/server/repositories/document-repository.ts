import prisma from "@/lib/prisma";
import type { Prisma, PrismaClient, Document } from "@/generated/prisma/client";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function createDocumentRepository(db: DbClient = prisma) {
  return {
    create(data: Prisma.DocumentCreateInput): Promise<Document> {
      return db.document.create({ data });
    },

    findById(id: string): Promise<Document | null> {
      return db.document.findUnique({ where: { id } });
    },

    findByFileKey(fileKey: string): Promise<Document | null> {
      return db.document.findFirst({ where: { fileKey } });
    },

    updateById(id: string, data: Prisma.DocumentUpdateInput): Promise<Document> {
      return db.document.update({ where: { id }, data });
    },

    deleteById(id: string): Promise<Document> {
      return db.document.delete({ where: { id } });
    },
  } as const;
}

export const documentRepository = createDocumentRepository();