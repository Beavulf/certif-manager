import { z } from 'zod';

import { MAX_NOTIFICATION_DAYS, MIN_NOTIFICATION_DAYS } from '@/constants/notification-days';

export const notificationLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100_000).default(10),
  search: z.string().trim().max(200).optional(),
  status: z.enum(['all', 'sent', 'failed']).default('all'),
  period: z.enum(['all', 'today', '7d', '30d']).default('all'),
});

export type NotificationLogsQuery = z.infer<typeof notificationLogsQuerySchema>;

export const runNotificationCheckSchema = z.object({
  daysBeforeExpiry: z
    .array(z.coerce.number().int().min(MIN_NOTIFICATION_DAYS).max(MAX_NOTIFICATION_DAYS))
    .min(1, 'Укажите хотя бы один день')
    .max(10, 'Не более 10 значений')
    .optional(),
  ignoreAlreadySent: z.boolean().optional(),
  useTestDays: z.boolean().optional(),
});

export type RunNotificationCheckInput = z.infer<typeof runNotificationCheckSchema>;
