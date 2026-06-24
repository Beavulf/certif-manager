'use server';

import { requireAuth } from '@/lib/session-helper';
import type { EmployeeListItem } from '@/lib/employee-table-utils';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { employeeService } from '@/server/services/employee-service';
import type { SafeResult } from '@/types/safe-result-types';

export async function getEmployeesPageAction(): Promise<
  SafeResult<EmployeeListItem[]>
> {
  await requireAuth();

  try {
    const employees = await employeeService.findMany({
      orderBy: { fullName: 'asc' },
      include: {
        certificates: {
          select: {
            id: true,
            status: true,
            serialNumber: true,
            subjectCN: true,
            validTo: true,
          },
          orderBy: { validTo: 'desc' },
        },
      },
    });

    const items: EmployeeListItem[] = employees.map((employee) => ({
      id: employee.id,
      fullName: employee.fullName,
      email: employee.email,
      adUsername: employee.adUsername,
      department: employee.department,
      position: employee.position,
      isActive: employee.isActive,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
      certificates: employee.certificates ?? [],
    }));

    return { success: true, data: items };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
