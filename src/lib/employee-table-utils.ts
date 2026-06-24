import type { CertStatus } from '@/generated/prisma/client';

export type EmployeeCertificateSummary = {
  id: string;
  status: CertStatus;
  serialNumber: string;
  subjectCN: string;
  validTo: Date;
};

export type EmployeeListItem = {
  id: string;
  fullName: string;
  email: string;
  adUsername: string | null;
  department: string | null;
  position: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  certificates: EmployeeCertificateSummary[];
};

export type EmployeeStats = {
  total: number;
  active: number;
  inactive: number;
  withCertificates: number;
  withoutCertificates: number;
};

export type EmployeeStatusFilter = 'all' | 'active' | 'inactive';

export function computeEmployeeStats(employees: EmployeeListItem[]): EmployeeStats {
  let active = 0;
  let inactive = 0;
  let withCertificates = 0;

  for (const employee of employees) {
    if (employee.isActive) active += 1;
    else inactive += 1;
    if (employee.certificates.length > 0) withCertificates += 1;
  }

  return {
    total: employees.length,
    active,
    inactive,
    withCertificates,
    withoutCertificates: employees.length - withCertificates,
  };
}

export function filterEmployees(
  employees: EmployeeListItem[],
  search: string,
  status: EmployeeStatusFilter,
): EmployeeListItem[] {
  const query = search.trim().toLowerCase();

  return employees.filter((employee) => {
    if (status === 'active' && !employee.isActive) return false;
    if (status === 'inactive' && employee.isActive) return false;

    if (!query) return true;

    const haystack = [
      employee.fullName,
      employee.email,
      employee.adUsername ?? '',
      employee.department ?? '',
      employee.position ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function countActiveCertificates(
  certificates: EmployeeCertificateSummary[],
): number {
  return certificates.filter((cert) => cert.status === 'active').length;
}
