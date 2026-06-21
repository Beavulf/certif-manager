'use server';

import { requireAuth } from '@/lib/session-helper';
import { getSystemStatus } from '@/lib/system-status';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { appSettingsService } from '@/server/services/app-settings-service';
import { notificationSettingsService } from '@/server/services/notification-settings-service';
import type { SettingsBundle, NotificationSettingsPublic, PublicAppSettings } from '@/types/settings-types';
import type { SafeResult } from '@/types/safe-result-types';

function toPublicNotificationSettings(
  settings: Awaited<ReturnType<typeof notificationSettingsService.getOrCreate>>,
): NotificationSettingsPublic {
  const { smtpPassword, ...rest } = settings;
  return {
    ...rest,
    hasSmtpPassword: Boolean(smtpPassword),
  };
}

export async function getSettingsAction(): Promise<SafeResult<SettingsBundle>> {
  await requireAuth();

  try {
    const [app, notification] = await Promise.all([
      appSettingsService.getOrCreate(),
      notificationSettingsService.getOrCreate(),
    ]);

    const systemStatus = await getSystemStatus();

    return {
      success: true,
      data: {
        app,
        notification: toPublicNotificationSettings(notification),
        systemStatus,
      },
    };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}

export async function getPublicAppSettingsAction(): Promise<
  SafeResult<PublicAppSettings>
> {
  await requireAuth();

  try {
    const app = await appSettingsService.getOrCreate();
    return {
      success: true as const,
      data: {
        warningDays: app.warningDays,
        criticalDays: app.criticalDays,
        maxFileSizeMb: app.maxFileSizeMb,
        allowedCertTypes: app.allowedCertTypes,
        allowedDocTypes: app.allowedDocTypes,
      },
    };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
