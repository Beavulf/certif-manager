'use server'

import type { Employee } from "@/generated/prisma/client";
import { parseFormBoolean } from "@/lib/employee-form-utils";
import { requireAuth } from "@/lib/session-helper";
import { createEmployeeSchema } from "@/schemas/employee-schema";
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { auditlogService } from "@/server/services/auditlog-service";
import { employeeService } from "@/server/services/employee-service";
import { AUDIT_ENTITY } from "@/types/auditlog-types";
import type { SafeResult } from "@/types/safe-result-types";

export async function createEmployeeAction(
  formData: FormData,
):Promise<SafeResult<Employee>> {
  const session = await requireAuth();

  const parsed = createEmployeeSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    adUsername: formData.get("adUsername"),
    department: formData.get("department"),
    position: formData.get("position"),
    isActive: parseFormBoolean(formData.get("isActive")) ?? true,
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

    await auditlogService.log({
      action: 'editEmployee',
      entityType: AUDIT_ENTITY.employee,
      entityId: employee.id,
      displayName: `Сотрудник создан: ${employee.fullName} (${employee.email})`,
      adUsername: session.username,
    });

    return {
      success: true,
      data: employee
    }
  } catch(error) {
    return mapErrorToSafeResult(error);
  }

}
