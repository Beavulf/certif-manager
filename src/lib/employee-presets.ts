export const EMPLOYEE_PRESETS = [
  {
    id: 'no-certs',
    label: 'Без сертификатов',
    description: 'Активные сотрудники без привязанных сертификатов',
  },
  {
    id: 'stale-ad',
    label: 'Устаревшие из AD',
    description: 'Не обновлялись более 90 дней',
  },
] as const;

export type EmployeePresetId = (typeof EMPLOYEE_PRESETS)[number]['id'];

const STALE_DAYS = 90;

export function isEmployeePresetId(value: string | null): value is EmployeePresetId {
  return EMPLOYEE_PRESETS.some((preset) => preset.id === value);
}

export function applyEmployeePreset<T extends {
  isActive: boolean;
  certificates: unknown[];
  adUsername: string | null;
  updatedAt: Date;
}>(
  employees: T[],
  preset: EmployeePresetId | null,
): T[] {
  if (!preset) return employees;

  switch (preset) {
    case 'no-certs':
      return employees.filter(
        (employee) => employee.isActive && employee.certificates.length === 0,
      );
    case 'stale-ad': {
      const threshold = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
      return employees.filter(
        (employee) =>
          Boolean(employee.adUsername) &&
          new Date(employee.updatedAt).getTime() < threshold,
      );
    }
    default:
      return employees;
  }
}

export function countByEmployeePreset<T extends {
  isActive: boolean;
  certificates: unknown[];
  adUsername: string | null;
  updatedAt: Date;
}>(employees: T[]): Record<EmployeePresetId, number> {
  return {
    'no-certs': applyEmployeePreset(employees, 'no-certs').length,
    'stale-ad': applyEmployeePreset(employees, 'stale-ad').length,
  };
}

export function isEmployeeDataStale(updatedAt: Date, adUsername: string | null): boolean {
  if (!adUsername) return false;
  const threshold = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
  return new Date(updatedAt).getTime() < threshold;
}

export function getPresetLabel(preset: EmployeePresetId): string {
  return EMPLOYEE_PRESETS.find((item) => item.id === preset)?.label ?? preset;
}
