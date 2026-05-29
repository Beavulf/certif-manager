'use server'

import type { Employee } from '@/generated/prisma/client'
import { requireAuth } from '@/lib/session-helper'
import { mapErrorToSafeResult } from '@/server/errors/map-error'
import { employeeService } from '@/server/services/employee-service'
import type { SafeResult } from '@/types/safe-result-types'

export type EmployeeListItem = Pick<
  Employee,
  'id' | 'fullName' | 'email' | 'department' | 'adUsername'
>

export async function getEmployeesAction(): Promise<
  SafeResult<EmployeeListItem[]>
> {
  await requireAuth()

  try {
    const employees = await employeeService.findMany({
      where: { isActive: true },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        department: true,
        adUsername: true,
      },
    })

    return { success: true, data: employees }
  } catch (error) {
    return mapErrorToSafeResult(error)
  }
}
