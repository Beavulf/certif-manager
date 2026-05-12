import prisma from "@/lib/prisma";
import type { Prisma, PrismaClient, User } from "@/generated/prisma/client";

export type DbClient = PrismaClient | Prisma.TransactionClient;

import { handlePrismaError } from "../errors/prisma-error-handler";

export function createUserRepository(db: DbClient = prisma) {
  return {
    async create(data: Prisma.UserCreateInput): Promise<User> {
      try {
        return await db.user.create({ data });
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async findMany<T extends Prisma.UserFindManyArgs>(
      args?: Prisma.SelectSubset<T, Prisma.UserFindManyArgs>
    ): Promise<Prisma.UserGetPayload<T>[]> {
      try {
        return await db.user.findMany<T>(args);
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async findById(id: string): Promise<User | null> {
      try {
        return await db.user.findUnique({ where: { id } });
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async findByAdUsername(adUsername: string): Promise<User | null> {
      try {
        return await db.user.findUnique({ where: { adUsername } });
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async updateById(id: string, data: Prisma.UserUpdateInput): Promise<User> {
      try {
        return await db.user.update({ where: { id }, data });
      } catch (error) {
        handlePrismaError(error);
      }
    },

    async deleteById(id: string): Promise<User> {
      try {
        return await db.user.delete({ where: { id } });
      } catch (error) {
        handlePrismaError(error);
      }
    },
  } as const;
}

export const userRepository = createUserRepository();