'use server';

import { z } from 'zod';

import { getAdEmailDomain } from '@/lib/app-settings-helpers';
import { normalizePersonName } from '@/lib/person-name-utils';
import { requireAuth } from '@/lib/session-helper';
import { checkIdEmployeeSchema } from '@/schemas/employee-schema';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { appSettingsService } from '@/server/services/app-settings-service';
import { employeeService } from '@/server/services/employee-service';
import { getEmployeeInfoFromAD } from '@/server/services/graphql-service';
import { AUDIT_ENTITY } from '@/types/auditlog-types';
import type { Employee } from '@/generated/prisma/client';
import type { SafeResult } from '@/types/safe-result-types';

export async function syncEmployeeFromAdAction(
  employeeId: string,
): Promise<SafeResult<Employee>> {
  const session = await requireAuth();
  const parsed = checkIdEmployeeSchema.safeParse({ id: employeeId });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const employee = await employeeService.findByIdOrThrow(parsed.data.id);
    if (!employee.adUsername) {
      return {
        success: false,
        error: 'У сотрудника не указан логин AD',
        code: 'BAD_REQUEST',
      };
    }

    const adResult = await getEmployeeInfoFromAD(employee.adUsername);
    if (!adResult.success || !adResult.data?.length) {
      return {
        success: false,
        error: adResult.error ?? 'Пользователь не найден в AD',
        code: adResult.code,
      };
    }

    const record =
      adResult.data.find(
        (item) =>
          item.sAMAccountName.toLowerCase() === employee.adUsername!.toLowerCase(),
      ) ?? adResult.data[0];

    const appSettings = await appSettingsService.getOrCreate();
    const emailDomain = getAdEmailDomain(appSettings);
    const email = emailDomain
      ? `${record.sAMAccountName}@${emailDomain}`
      : employee.email;

    const updated = await employeeService.update(employee.id, {
      fullName: record.cn || employee.fullName,
      email,
      department: record.department || employee.department,
      position: record.title || employee.position,
    });

    await auditlogService.log({
      action: 'editEmployee',
      entityType: AUDIT_ENTITY.employee,
      entityId: updated.id,
      displayName: `Данные обновлены из AD: ${updated.fullName}`,
      adUsername: session.username,
    });

    return { success: true, data: updated };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}

const bulkDeactivateSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1),
});

export async function bulkDeactivateEmployeesAction(
  employeeIds: string[],
): Promise<SafeResult<{ updatedCount: number }>> {
  const session = await requireAuth();
  const parsed = bulkDeactivateSchema.safeParse({ employeeIds });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    let updatedCount = 0;

    for (const id of parsed.data.employeeIds) {
      const employee = await employeeService.findById(id);
      if (!employee || !employee.isActive) continue;

      await employeeService.update(id, { isActive: false });
      updatedCount += 1;
    }

    if (updatedCount > 0) {
      await auditlogService.log({
        action: 'editEmployee',
        entityType: AUDIT_ENTITY.employee,
        displayName: `Массовая деактивация сотрудников: ${updatedCount}`,
        adUsername: session.username,
      });
    }

    return { success: true, data: { updatedCount } };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}

const bulkAssignSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1),
});

export async function bulkAssignCertificatesAction(
  employeeIds: string[],
): Promise<SafeResult<{ assignedCount: number; skippedCount: number }>> {
  const session = await requireAuth();
  const parsed = bulkAssignSchema.safeParse({ employeeIds });

  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { certificateService } = await import('@/server/services/certificate-service');

    const unassigned = await certificateService.findMany({
      where: { employeeId: null },
      orderBy: { uploadedAt: 'desc' },
    });

    const unassignedByName = new Map<string, typeof unassigned>();
    for (const cert of unassigned) {
      const key = normalizePersonName(cert.subjectCN);
      const bucket = unassignedByName.get(key) ?? [];
      bucket.push(cert);
      unassignedByName.set(key, bucket);
    }

    let assignedCount = 0;
    let skippedCount = 0;

    for (const employeeId of parsed.data.employeeIds) {
      const employee = await employeeService.findById(employeeId, true);
      if (!employee || !employee.isActive) {
        skippedCount += 1;
        continue;
      }

      const certs = unassignedByName.get(normalizePersonName(employee.fullName));
      if (!certs?.length) {
        skippedCount += 1;
        continue;
      }

      const cert = certs.shift();
      if (!cert) {
        skippedCount += 1;
        continue;
      }

      await certificateService.assignToEmployee(cert.id, employee.id);
      assignedCount += 1;

      if (certs.length === 0) {
        unassignedByName.delete(normalizePersonName(employee.fullName));
      }
    }

    if (assignedCount > 0) {
      await auditlogService.log({
        action: 'editCertificate',
        entityType: AUDIT_ENTITY.certificate,
        displayName: `Массовая привязка сертификатов: ${assignedCount}`,
        adUsername: session.username,
      });
    }

    return { success: true, data: { assignedCount, skippedCount } };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
