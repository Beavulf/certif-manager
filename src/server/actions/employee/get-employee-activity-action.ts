'use server';

import { requireAuth } from '@/lib/session-helper';
import { checkIdEmployeeSchema } from '@/schemas/employee-schema';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { AUDIT_ENTITY } from '@/types/auditlog-types';
import { AUDIT_ACTION_LABELS } from '@/types/settings-types';
import type { SafeResult } from '@/types/safe-result-types';

export type EmployeeActivityItem = {
  id: string;
  createdAt: Date;
  action: string;
  actionLabel: string;
  displayName: string | null;
  adUsername: string | null;
};

export async function getEmployeeActivityAction(
  employeeId: string,
): Promise<SafeResult<EmployeeActivityItem[]>> {
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
    const logs = await auditlogService.findMany({
      where: {
        entityType: AUDIT_ENTITY.employee,
        entityId: parsed.data.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    return {
      success: true,
      data: logs.map((log) => ({
        id: log.id,
        createdAt: log.createdAt,
        action: log.action,
        actionLabel: AUDIT_ACTION_LABELS[log.action] ?? log.action,
        displayName: log.displayName,
        adUsername: log.adUsername,
      })),
    };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
