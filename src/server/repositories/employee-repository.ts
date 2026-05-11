import prisma from "@/lib/prisma";
import type { Prisma, PrismaClient, Employee } from "@/generated/prisma/client";
import type { EmployeePayloadWithCertificates, GetEmployeesOptions } from "@/types/employee-types";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function createEmployeeRepository(db: DbClient = prisma) {
  return {
    create(data: Prisma.EmployeeCreateInput): Promise<Employee> {
      return db.employee.create({ data });
    },

    // Получение всех сотрудников с возможностью фильтрации.
    getAllWithOptions(options?: GetEmployeesOptions): Promise<Employee[]> {
      const { filter, orderBy, include, skip, take } = options || {};
      return db.employee.findMany({
        where: filter,
        orderBy,
        skip,
        take,
        include
      });
    },

    findById(id: string, include?: Prisma.EmployeeInclude): Promise<EmployeePayloadWithCertificates> {
      return db.employee.findUnique({ where: { id }, include: include});
    },

    findByAdUsername(adUsername: string, include?: Prisma.EmployeeInclude): Promise<EmployeePayloadWithCertificates> {
      return db.employee.findUnique({ where: { adUsername }, include: include });
    },

    updateById(id: string, data: Prisma.EmployeeUpdateInput): Promise<Employee> {
      return db.employee.update({ where: { id }, data, include: { certificates: true }});
    },

    deleteById(id: string): Promise<Employee> {
      return db.employee.delete({ where: { id } });
    },
  } as const;
}

export const employeeRepository = createEmployeeRepository();