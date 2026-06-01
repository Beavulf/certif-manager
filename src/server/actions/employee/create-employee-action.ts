'use server'

import type { Employee } from "@/generated/prisma/client";
import { createEmployeeSchema } from "@/schemas/employee-schema";
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { employeeService } from "@/server/services/employee-service";
import type { SafeResult } from "@/types/safe-result-types";

export async function createEmployeeAction(
  formData: FormData,
):Promise<SafeResult<Employee>> {
  const parsed = createEmployeeSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    adUsername: formData.get("adUsername"),
    department: formData.get("department"),
    position: formData.get("position"),
    isActive: formData.get("isActive")
  })

  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors
    }
  }

  try {
    const employee = await employeeService.create(parsed.data)
    return {
      success: true,
      data: employee
    }
  } catch(error) {
    return mapErrorToSafeResult(error);
  }

}