import { z } from 'zod';

export const updateCertificateNotesSchema = z.object({
  certificateId: z.string().uuid('Некорректный идентификатор сертификата'),
  notes: z
    .string()
    .max(255, 'Примечание не может быть длиннее 255 символов')
    .nullable(),
});

export type UpdateCertificateNotesInput = z.infer<typeof updateCertificateNotesSchema>;
