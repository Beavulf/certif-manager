'use server';

import { requireAuth } from '@/lib/session-helper';
import type { EmployeeListItem } from '@/lib/employee-table-utils';
import { checkIdEmployeeSchema } from '@/schemas/employee-schema';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { employeeService } from '@/server/services/employee-service';
import type { SafeResult } from '@/types/safe-result-types';

export async function getEmployeeDetailAction(
  employeeId: string,
): Promise<SafeResult<EmployeeListItem>> {
  await requireAuth();

  const parsed = checkIdEmployeeSchema.safeParse({ id: employeeId });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const employee = await employeeService.findByIdOrThrow(parsed.data.id, true);

    if (!('certificates' in employee)) {
      return { success: false, error: 'Сотрудник не найден' };
    }

    return {
      success: true,
      data: {
        id: employee.id,
        fullName: employee.fullName,
        email: employee.email,
        adUsername: employee.adUsername,
        department: employee.department,
        position: employee.position,
        isActive: employee.isActive,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
        certificates: employee.certificates.map((cert) => ({
          id: cert.id,
          status: cert.status,
          serialNumber: cert.serialNumber,
          subjectCN: cert.subjectCN,
          validTo: cert.validTo,
        })),
      },
    };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
