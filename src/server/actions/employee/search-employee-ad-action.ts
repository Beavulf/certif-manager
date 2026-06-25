'use server';

import { getAdEmailDomain } from '@/lib/app-settings-helpers';
import { requireAuth } from '@/lib/session-helper';
import { searchEmployeeAdSchema } from '@/schemas/employee-schema';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { employeeRepository } from '@/server/repositories/employee-repository';
import { appSettingsService } from '@/server/services/app-settings-service';
import { getEmployeeInfoFromAD } from '@/server/services/graphql-service';
import type { SafeResult } from '@/types/safe-result-types';

export type EmployeeADSearchItem = {
  fullName: string;
  email: string;
  adUsername: string;
  department: string;
  position: string;
  company: string;
  distinguishedName: string;
  alreadyExists: boolean;
  existingEmployeeId?: string;
};

export async function searchEmployeeAdAction(
  query: string,
): Promise<SafeResult<EmployeeADSearchItem[]>> {
  await requireAuth();

  const parsed = searchEmployeeAdSchema.safeParse({ query });
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
      code: 'BAD_REQUEST',
    };
  }

  const adResult = await getEmployeeInfoFromAD(parsed.data.query);
  if (!adResult.success || !adResult.data) {
    return {
      success: false,
      error: adResult.error ?? 'Не удалось получить данные из AD',
      code: adResult.code,
      fieldErrors: adResult.fieldErrors,
    };
  }

  try {
    const appSettings = await appSettingsService.getOrCreate();
    const emailDomain = getAdEmailDomain(appSettings);
    if (!emailDomain) {
      return {
        success: false,
        error:
          'Домен email не настроен. Укажите AD Email Domain в настройках или переменной AD_EMAIL_DOMAIN',
        code: 'BAD_REQUEST',
      };
    }

    const adUsernames = adResult.data.map((record) => record.sAMAccountName);
    const existingEmployees = await employeeRepository.findMany({
      where: { adUsername: { in: adUsernames } },
      select: { id: true, adUsername: true },
    });
    const existingByUsername = new Map(
      existingEmployees
        .filter((employee) => employee.adUsername)
        .map((employee) => [employee.adUsername!, employee.id]),
    );

    const items: EmployeeADSearchItem[] = adResult.data.map((record) => {
      const adUsername = record.sAMAccountName;
      const existingId = existingByUsername.get(adUsername);

      return {
        fullName: record.cn,
        email: `${adUsername}@${emailDomain}`,
        adUsername,
        department: record.department,
        position: record.title,
        company: record.company,
        distinguishedName: record.distinguishedName,
        alreadyExists: Boolean(existingId),
        existingEmployeeId: existingId,
      };
    });

    return { success: true, data: items };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
