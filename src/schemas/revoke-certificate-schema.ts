import { z } from 'zod';

export const revokeCertificateSchema = z.object({
  certificateId: z
    .string({ error: 'Идентификатор сертификата обязателен' })
    .uuid('Некорректный идентификатор сертификата'),
});

export type RevokeCertificateInput = z.infer<typeof revokeCertificateSchema>;
