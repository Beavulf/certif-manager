'use server';

import { z } from 'zod';

import { parseEmployeesCsv } from '@/lib/employee-import';
import { requireAuth } from '@/lib/session-helper';
import { createEmployeeSchema } from '@/schemas/employee-schema';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { employeeService } from '@/server/services/employee-service';
import { AUDIT_ENTITY } from '@/types/auditlog-types';
import type { SafeResult } from '@/types/safe-result-types';

const importSchema = z.object({
  csvContent: z.string().min(1, 'Файл пуст'),
});

export type EmployeeImportResult = {
  createdCount: number;
  skippedCount: number;
  errors: { row: number; message: string }[];
};

export async function importEmployeesAction(
  csvContent: string,
): Promise<SafeResult<EmployeeImportResult>> {
  const session = await requireAuth();
  const parsed = importSchema.safeParse({ csvContent });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const rows = parseEmployeesCsv(parsed.data.csvContent);
    const result: EmployeeImportResult = {
      createdCount: 0,
      skippedCount: 0,
      errors: [],
    };

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const validation = createEmployeeSchema.safeParse({
        ...row,
        isActive: true,
      });

      if (!validation.success) {
        result.errors.push({
          row: index + 2,
          message: 'Некорректные данные строки',
        });
        continue;
      }

      try {
        await employeeService.create(validation.data);
        result.createdCount += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Не удалось создать сотрудника';
        if (message.includes('уже существует')) {
          result.skippedCount += 1;
        } else {
          result.errors.push({ row: index + 2, message });
        }
      }
    }

    if (result.createdCount > 0) {
      await auditlogService.log({
        action: 'editEmployee',
        entityType: AUDIT_ENTITY.employee,
        displayName: `Импорт сотрудников из CSV: ${result.createdCount}`,
        adUsername: session.username,
      });
    }

    return { success: true, data: result };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
