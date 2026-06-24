'use server';

import { requireAuth } from "@/lib/session-helper";
import { checkIdEmployeeSchema } from "@/schemas/employee-schema";
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { auditlogService } from "@/server/services/auditlog-service";
import { employeeService } from "@/server/services/employee-service";
import { AUDIT_ENTITY } from "@/types/auditlog-types";
import type { Employee } from "@/generated/prisma/client";
import type { SafeResult } from "@/types/safe-result-types";

export async function deleteEmployeeByIdAction(
  employeeId: string
): Promise<SafeResult<Employee>> {
  const session = await requireAuth();

  const parsed = checkIdEmployeeSchema.safeParse({ 
    id: employeeId
  })
  
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors
    }  
  }

  const { id } = parsed.data;

  try {
    const employee = await employeeService.deleteById(id);

    await auditlogService.log({
      action: 'editEmployee',
      entityType: AUDIT_ENTITY.employee,
      entityId: employee.id,
      displayName: `Сотрудник удалён: ${employee.fullName} (${employee.email})`,
      adUsername: session.username,
    });

    return { success: true, data: employee }
  } catch(error) {
    return mapErrorToSafeResult(error)
  }
}
