import { employeeRepository } from "../repositories/employee-repository";
import type { EmployeesWithIncludes } from "@/types/employee-types";
import type { Prisma, Employee } from "@/generated/prisma/client";
import { BadRequestError, NotFoundError } from "../errors/app-error";
import type { EmployeeGetPayload } from "@/generated/prisma/models";

export const employeeService = {

  async findMany(
    args?: Prisma.EmployeeFindManyArgs
  ): Promise<EmployeesWithIncludes[]> {
    return await employeeRepository.findMany(args);
  },

  async create(data: Prisma.EmployeeCreateInput) {
    const { adUsername, email, fullName } = data;
    if (!email || !fullName || !adUsername) {
      throw new BadRequestError("Отсутствуют обязательные поля: email, fullName, adUsername")
    }

    const employee = await employeeRepository.findByAdUsername(adUsername);
    if (employee) {
      throw new BadRequestError("Сотрудник с таким логином уже существует");
    }

    return await employeeRepository.create(data);
  },

  async update(id: string, data: Prisma.EmployeeUpdateInput) {
    const employee = await this.findByIdOrThrow(id);
    const updatedEmployee = await employeeRepository.updateById(employee.id, data);
    if (!updatedEmployee) {
      throw new NotFoundError("Сотрудник при обновлении не найден");
    }
    return updatedEmployee;
  },

  async deleteById(id: string): Promise<Employee> {
    const employee = await this.findByIdOrThrow(id);
    const deletedEmployee = await employeeRepository.deleteById(employee.id);
    if (!deletedEmployee) {
      throw new NotFoundError("Сотрудник для удалении не найден");
    }
    return deletedEmployee;
  },

  async findByIdOrThrow(id: string, includeCert: boolean = false): Promise<EmployeeGetPayload<{include: {certificates: true}}> | Employee> {
    const include: Prisma.EmployeeInclude = { certificates: true }
    const employee = await employeeRepository.findById(id, includeCert ? include : undefined);
    if (!employee) {
      throw new NotFoundError("Сотрудник не найден");
    }
    return employee;
  },

  async findById(id: string, includeCert: boolean = false): Promise<Employee | null> {
    const include: Prisma.EmployeeInclude = { certificates: true }
    return await employeeRepository.findById(id, includeCert ? include : undefined);
  },
}
