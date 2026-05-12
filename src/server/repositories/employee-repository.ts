import prisma from "@/lib/prisma";
import type { Prisma, PrismaClient, Employee } from "@/generated/prisma/client";
import type { EmployeePayloadWithCertificates } from "@/types/employee-types";
import { handlePrismaError } from "../errors/prisma-error-handler";
import type { EmployeeFindManyArgs, EmployeeGetPayload } from "@/generated/prisma/models";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function createEmployeeRepository(db: DbClient = prisma) {
  return {
    async create(data: Prisma.EmployeeCreateInput): Promise<Employee> {
      try {
        return await db.employee.create({ data });
      } catch(error) {
        handlePrismaError(error);
      }
    },

    // Получение всех сотрудников с возможностью фильтрации.
    async findMany<T extends EmployeeFindManyArgs>(
      args?: Prisma.SelectSubset<T, EmployeeFindManyArgs>
    ):Promise<EmployeeGetPayload<T>[]> {
      try {
        return await db.employee.findMany<T>(args);
      } catch(error) {
        handlePrismaError(error)
      }
    },

    async findById(id: string, include?: Prisma.EmployeeInclude): Promise<EmployeePayloadWithCertificates> {
      try {
        return await db.employee.findUnique({ where: { id }, include: include});
      } catch(error) {
        handlePrismaError(error);
      }
    },

    async findByAdUsername(adUsername: string, include?: Prisma.EmployeeInclude): Promise<EmployeePayloadWithCertificates> {
      try {
        return await db.employee.findUnique({ where: { adUsername }, include: include });
      } catch(error) {
        handlePrismaError(error);
      }
    },

    async updateById(id: string, data: Prisma.EmployeeUpdateInput): Promise<Employee> {
      try {
        return await db.employee.update({ 
          where: { id }, 
          data, 
          // include: { certificates: true }
        });
      } catch(error) {
        handlePrismaError(error);
      }
    },

    async deleteById(id: string): Promise<Employee> {
      try {
        return await db.employee.delete({ where: { id } });
      } catch(error) {
        handlePrismaError(error);
      }
    },
  } as const;
}

export const employeeRepository = createEmployeeRepository();