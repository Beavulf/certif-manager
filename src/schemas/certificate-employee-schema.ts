import { z } from 'zod';

export const updateCertificateEmployeeSchema = z.object({
  certificateId: z
    .string({ error: 'certificateId обязателен' })
    .uuid('Некорректный идентификатор сертификата'),
  employeeId: z
    .string()
    .uuid('Некорректный идентификатор сотрудника')
    .nullable(),
});

export type UpdateCertificateEmployeeInput = z.infer<
  typeof updateCertificateEmployeeSchema
>;
