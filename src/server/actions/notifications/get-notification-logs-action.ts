'use server';

import { z } from 'zod';

import { requireAuth } from '@/lib/session-helper';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { notificationLogService } from '@/server/services/notification-log-service';
import type { NotificationLog } from '@/generated/prisma/client';
import type { SafeResult } from '@/types/safe-result-types';

const schema = z.object({
  certificateId: z.string().uuid('Некорректный идентификатор сертификата'),
});

export async function getNotificationLogsByCertificateAction(
  certificateId: string,
): Promise<SafeResult<NotificationLog[]>> {
  await requireAuth();

  const parsed = schema.safeParse({ certificateId });
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const logs = await notificationLogService.getNotificationLogs(parsed.data.certificateId);
    logs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    return { success: true, data: logs };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
