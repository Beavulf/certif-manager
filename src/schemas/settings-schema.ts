import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const updateAppSettingsSchema = z
  .object({
    appName: z
      .string()
      .trim()
      .min(1, 'Название обязательно')
      .max(100, 'Не более 100 символов'),
    organizationName: z
      .string()
      .trim()
      .max(200, 'Не более 200 символов')
      .optional()
      .nullable(),
    timezone: z.string().trim().min(1, 'Часовой пояс обязателен'),
    warningDays: z.coerce
      .number()
      .int('Только целое число')
      .min(1, 'Минимум 1 день')
      .max(365, 'Максимум 365 дней'),
    criticalDays: z.coerce
      .number()
      .int('Только целое число')
      .min(1, 'Минимум 1 день')
      .max(365, 'Максимум 365 дней'),
    maxFileSizeMb: z.coerce
      .number()
      .int('Только целое число')
      .min(1, 'Минимум 1 МБ')
      .max(100, 'Максимум 100 МБ'),
    allowedCertTypes: z
      .array(z.string().trim().startsWith('.', 'Расширение должно начинаться с точки'))
      .min(1, 'Выберите хотя бы один тип сертификата'),
    allowedDocTypes: z
      .array(z.string().trim().startsWith('.', 'Расширение должно начинаться с точки'))
      .min(1, 'Выберите хотя бы один тип документа'),
    cronCheckTime: z
      .string()
      .trim()
      .regex(timeRegex, 'Формат: ЧЧ:ММ (например, 08:00)'),
    adEmailDomain: z
      .string()
      .trim()
      .max(100, 'Не более 100 символов')
      .optional()
      .nullable(),
    auditLogRetentionDays: z.coerce
      .number()
      .int('Только целое число')
      .min(7, 'Минимум 7 дней')
      .max(3650, 'Максимум 10 лет'),
  })
  .refine((data) => data.criticalDays <= data.warningDays, {
    message: 'Критический порог не может быть больше порога предупреждения',
    path: ['criticalDays'],
  });

export type UpdateAppSettingsInput = z.infer<typeof updateAppSettingsSchema>;

export const updateNotificationSettingsSchema = z
  .object({
    id: z.string().uuid().optional(),
    isEnabled: z.boolean(),
    daysBeforeExpiry: z
      .array(z.coerce.number().int().min(1).max(365))
      .min(1, 'Укажите хотя бы один день')
      .max(10, 'Не более 10 напоминаний'),
    smtpHost: z.string().trim().min(1, 'SMTP-хост обязателен'),
    smtpPort: z.coerce
      .number()
      .int()
      .min(1, 'Порт от 1 до 65535')
      .max(65535, 'Порт от 1 до 65535'),
    smtpUser: z.string().trim().max(200).optional().nullable(),
    smtpPassword: z.string().max(200).optional().nullable(),
    senderEmail: z
      .string()
      .trim()
      .email('Некорректный email отправителя'),
    senderName: z.string().trim().max(100).optional().nullable(),
  })
  .transform((data) => ({
    ...data,
    daysBeforeExpiry: [...new Set(data.daysBeforeExpiry)].sort((a, b) => b - a),
    smtpUser: data.smtpUser?.trim() || null,
    smtpPassword: data.smtpPassword?.trim() || null,
    senderName: data.senderName?.trim() || null,
  }));

export type UpdateNotificationSettingsInput = z.infer<
  typeof updateNotificationSettingsSchema
>;

export const testSmtpSchema = z.object({
  testEmail: z
    .string()
    .trim()
    .email('Некорректный email для тестового письма'),
});

export const auditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});
