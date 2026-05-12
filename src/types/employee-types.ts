import type { Certificate, Employee, Prisma } from "@/generated/prisma/client";

export interface GetEmployeesOptions {
  filter?: Prisma.EmployeeWhereInput;
  orderBy?: Prisma.EmployeeOrderByWithRelationInput | Prisma.EmployeeOrderByWithRelationInput[];
  include?: Prisma.EmployeeInclude;
  skip?: number;
  take?: number;
  includeCertificates?: boolean;
  certificateStatus?: 'active' | 'expired' | 'revoked';
}

export type EmployeePayloadWithCertificates = Prisma.EmployeeGetPayload<{ include: { certificates: true } }> | Employee | null

export type EmployeesWithIncludes = Employee & {
  certificates?: Certificate[]
}