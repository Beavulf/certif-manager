import { z } from 'zod';

import { AuditAction } from '@/generated/prisma/client';
import { MAX_NOTIFICATION_DAYS, MIN_NOTIFICATION_DAYS } from '@/constants/notification-days';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const appSettingsFields = {
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
};

/** Partial update: each settings form sends only its own fields. */
export const updateAppSettingsSchema = z
  .object({
    appName: appSettingsFields.appName.optional(),
    organizationName: appSettingsFields.organizationName,
    timezone: appSettingsFields.timezone.optional(),
    warningDays: appSettingsFields.warningDays.optional(),
    criticalDays: appSettingsFields.criticalDays.optional(),
    maxFileSizeMb: appSettingsFields.maxFileSizeMb.optional(),
    allowedCertTypes: appSettingsFields.allowedCertTypes.optional(),
    allowedDocTypes: appSettingsFields.allowedDocTypes.optional(),
    cronCheckTime: appSettingsFields.cronCheckTime.optional(),
    adEmailDomain: appSettingsFields.adEmailDomain,
    auditLogRetentionDays: appSettingsFields.auditLogRetentionDays.optional(),
  })
  .refine(
    (data) =>
      Object.values(data).some((value) => value !== undefined),
    { message: 'Нет данных для обновления' },
  )
  .refine(
    (data) =>
      data.criticalDays === undefined ||
      data.warningDays === undefined ||
      data.criticalDays <= data.warningDays,
    {
      message: 'Критический порог не может быть больше порога предупреждения',
      path: ['criticalDays'],
    },
  );

export type UpdateAppSettingsInput = z.infer<typeof updateAppSettingsSchema>;

export const updateNotificationSettingsSchema = z
  .object({
    id: z.string().uuid().optional(),
    isEnabled: z.boolean(),
    daysBeforeExpiry: z
      .array(z.coerce.number().int().min(MIN_NOTIFICATION_DAYS).max(MAX_NOTIFICATION_DAYS))
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
  pageSize: z.coerce.number().int().min(5).max(100_000).default(10),
  action: z.nativeEnum(AuditAction).optional(),
  search: z.string().trim().max(100).optional(),
});

export type AuditLogsQueryInput = z.infer<typeof auditLogsQuerySchema>;
