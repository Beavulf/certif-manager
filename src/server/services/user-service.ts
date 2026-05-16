import { AlreadyExistsError, NotFoundError } from "../errors/app-error";
import { userRepository } from "../repositories/user-repository";
import type { User } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

export const userService = {

  async findMany(args?: Prisma.UserFindManyArgs): Promise<User[]> {
    return await userRepository.findMany(args);
  },

  async create(data: Prisma.UserCreateInput): Promise<User> {
    const user = await this.findByAdUsername(data.adUsername);
    if (user) {
      throw new AlreadyExistsError("Пользователь с таким логином уже существует");
    }
    return await userRepository.create(data);
  },

  async findByAdUsername(adUsername: string): Promise<User | null> {
    return await userRepository.findByAdUsername(adUsername);
  },

  async findByAdUsernameOrThrow(adUsername: string): Promise<User> {
    const user = await userRepository.findByAdUsername(adUsername);
    if (!user) {
      throw new NotFoundError("Пользователь не найден");
    }
    return user;
  },

  async findById(id: string): Promise<User | null> {
    return await userRepository.findById(id);
  },

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError("Пользователь не найден");
    }
    return user;
  },

  async updateById(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    const user = await this.findByIdOrThrow(id);
    return await userRepository.updateById(user.id, data);
  },

  async deleteById(id: string): Promise<User> {
    const user = await this.findByIdOrThrow(id);
    return await userRepository.deleteById(user.id);
  }
}