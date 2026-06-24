'use server';

import { requireAuth } from '@/lib/session-helper';
import { parseFormBoolean } from '@/lib/employee-form-utils';
import { updateEmployeeByIdSchema } from '@/schemas/employee-schema';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { employeeService } from '@/server/services/employee-service';
import { AUDIT_ENTITY } from '@/types/auditlog-types';
import type { Employee } from '@/generated/prisma/client';
import type { SafeResult } from '@/types/safe-result-types';

const UPDATE_FIELD_KEYS = [
  'adUsername',
  'fullName',
  'email',
  'department',
  'position',
  'isActive',
] as const;

export async function updateEmployeeByIdAction(
  employeeId: string,
  formData: FormData,
): Promise<SafeResult<Employee>> {
  const session = await requireAuth();

  const raw = Object.fromEntries(
    UPDATE_FIELD_KEYS.map((key) => {
      const value = formData.get(key);
      if (key === 'isActive') {
        return [key, parseFormBoolean(value)];
      }
      if (value === null || value === '') {
        return [key, undefined];
      }
      return [key, value];
    }),
  );

  const parsed = updateEmployeeByIdSchema.safeParse({
    id: employeeId,
    ...raw,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, ...data } = parsed.data;

  try {
    const employee = await employeeService.update(id, data);

    await auditlogService.log({
      action: 'editEmployee',
      entityType: AUDIT_ENTITY.employee,
      entityId: employee.id,
      displayName: `Сотрудник обновлён: ${employee.fullName} (${employee.email})`,
      adUsername: session.username,
    });

    return { success: true, data: employee };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
