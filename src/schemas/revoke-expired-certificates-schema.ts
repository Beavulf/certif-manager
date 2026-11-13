import { z } from 'zod';

export const revokeExpiredCertificatesSchema = z.object({
  /** Аннулировать сертификаты, истёкшие как минимум столько дней назад. */
  days: z
    .number({ error: 'Укажите количество дней' })
    .int('Количество дней должно быть целым числом')
    .min(1, 'Минимум 1 день')
    .max(365, 'Максимум 365 дней'),
});

export type RevokeExpiredCertificatesInput = z.infer<
  typeof revokeExpiredCertificatesSchema
>;
