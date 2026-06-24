'use server';

import type { CertStatus } from '@/generated/prisma/client';
import { requireAuth } from '@/lib/session-helper';
import { checkIdEmployeeSchema } from '@/schemas/employee-schema';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { certificateService } from '@/server/services/certificate-service';
import { employeeService } from '@/server/services/employee-service';
import type { SafeResult } from '@/types/safe-result-types';

export type AssignableCertificate = {
  id: string;
  subjectCN: string;
  serialNumber: string;
  validTo: Date;
  status: CertStatus;
};

export async function getAssignableCertificatesForEmployeeAction(
  employeeId: string,
): Promise<SafeResult<AssignableCertificate[]>> {
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
    const employee = await employeeService.findByIdOrThrow(parsed.data.id);
    const employeeName = employee.fullName.trim().toLowerCase();

    const unassigned = await certificateService.findMany({
      where: { employeeId: null },
      orderBy: { validTo: 'desc' },
      select: {
        id: true,
        subjectCN: true,
        serialNumber: true,
        validTo: true,
        status: true,
      },
    });

    const assignable = unassigned.filter(
      (cert) =>
        cert.status !== 'revoked' &&
        cert.subjectCN.trim().toLowerCase() === employeeName,
    );

    return { success: true, data: assignable };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
