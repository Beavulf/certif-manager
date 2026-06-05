'use server';

import { updateCertificateEmployeeSchema } from '@/schemas/certificate-employee-schema';
import { requireAuth } from '@/lib/session-helper';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { certificateService } from '@/server/services/certificate-service';
import { employeeService } from '@/server/services/employee-service';
import type { Certificate } from '@/generated/prisma/client';
import type { SafeResult } from '@/types/safe-result-types';

export async function updateCertificateEmployeeAction(input: {
  certificateId: string;
  employeeId: string | null;
}): Promise<SafeResult<Certificate>> {
  const session = await requireAuth();
  const username = session?.username;

  if (!username) {
    return {
      success: false,
      error: 'Ошибка получения имени пользователя',
      code: 'UNAUTHORIZED',
      fieldErrors: {},
    };
  }

  const parsed = updateCertificateEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, unknown>,
    };
  }

  const { certificateId, employeeId } = parsed.data;

  try {
    const before = await certificateService.findByIdOrThrow(certificateId);

    let certificate: Certificate;
    let displayName: string;

    if (employeeId === null) {
      const previousEmployeeId = before.employeeId;
      certificate = await certificateService.unassignFromEmployee(certificateId);
      const prevName = previousEmployeeId
        ? (await employeeService.findById(previousEmployeeId))?.fullName
        : null;
      displayName = `Сертификат отвязан от сотрудника: ${certificate.serialNumber}${
        prevName ? ` (${prevName})` : ''
      }`;
    } else {
      const employee = await employeeService.findByIdOrThrow(employeeId);
      const wasAssigned = Boolean(before.employeeId);
      certificate = await certificateService.assignToEmployee(
        certificateId,
        employeeId
      );
      displayName = wasAssigned
        ? `Изменена привязка сертификата ${certificate.serialNumber} → ${employee.fullName}`
        : `Сертификат привязан к сотруднику: ${certificate.serialNumber} → ${employee.fullName}`;
    }

    await auditlogService.log({
      action: 'editCertificate',
      entityType: 'certificate',
      entityId: certificate.id,
      displayName,
      adUsername: username,
    });

    return { success: true, data: certificate };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
