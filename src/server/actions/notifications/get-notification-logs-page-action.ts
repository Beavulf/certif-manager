'use server';

import { requireAuth } from '@/lib/session-helper';
import { notificationLogsQuerySchema } from '@/schemas/notifications-schema';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { notificationLogService } from '@/server/services/notification-log-service';
import type { NotificationLogWithIncludes } from '@/types/notification-log-types';
import type { NotificationStats } from '@/lib/notification-log-filters';
import type { SafeResult } from '@/types/safe-result-types';

export type NotificationLogsPage = {
  items: NotificationLogWithIncludes[];
  total: number;
  page: number;
  pageSize: number;
  stats: NotificationStats;
};

export async function getNotificationLogsPageAction(
  input?: unknown,
): Promise<SafeResult<NotificationLogsPage>> {
  await requireAuth();

  const parsed = notificationLogsQuerySchema.safeParse(input ?? {});
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const [page, stats] = await Promise.all([
      notificationLogService.findPage(parsed.data),
      notificationLogService.getStats(),
    ]);

    return {
      success: true,
      data: { ...page, stats },
    };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
