import prisma from "@/lib/prisma";
import type { Prisma, PrismaClient, User } from "@/generated/prisma/client";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function createUserRepository(db: DbClient = prisma) {
  return {
    create(data: Prisma.UserCreateInput): Promise<User> {
      return db.user.create({ data });
    },

    findById(id: string): Promise<User | null> {
      return db.user.findUnique({ where: { id } });
    },

    findByAdUsername(adUsername: string): Promise<User | null> {
      return db.user.findUnique({ where: { adUsername } });
    },

    updateById(id: string, data: Prisma.UserUpdateInput): Promise<User> {
      return db.user.update({ where: { id }, data });
    },

    deleteById(id: string): Promise<User> {
      return db.user.delete({ where: { id } });
    },
  } as const;
}

export const userRepository = createUserRepository();