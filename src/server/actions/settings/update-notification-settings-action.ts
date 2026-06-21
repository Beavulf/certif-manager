'use server';

import { requireAuth } from '@/lib/session-helper';
import { updateNotificationSettingsSchema } from '@/schemas/settings-schema';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { notificationSettingsService } from '@/server/services/notification-settings-service';
import type { NotificationSettings } from '@/generated/prisma/client';
import type { NotificationSettingsPublic } from '@/types/settings-types';
import type { SafeResult } from '@/types/safe-result-types';

function toPublic(settings: NotificationSettings): NotificationSettingsPublic {
  const { smtpPassword, ...rest } = settings;
  return {
    ...rest,
    hasSmtpPassword: Boolean(smtpPassword),
  };
}

export async function updateNotificationSettingsAction(
  input: unknown,
): Promise<SafeResult<NotificationSettingsPublic>> {
  const session = await requireAuth();
  const username = session.username;

  const parsed = updateNotificationSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const updated = await notificationSettingsService.upsertSettings({
      ...parsed.data,
      updatedBy: username,
    });

    await auditlogService.log({
      action: 'editSettings',
      entityType: 'notificationSettings',
      entityId: updated.id,
      displayName: `Обновлены настройки уведомлений (включено: ${updated.isEnabled ? 'да' : 'нет'})`,
      adUsername: username,
    });

    return { success: true, data: toPublic(updated) };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
