'use server';

import { sendTestEmail, verifySmtpConnection } from '@/lib/mail';
import { requireAuth } from '@/lib/session-helper';
import {
  testSmtpSchema,
  updateNotificationSettingsSchema,
} from '@/schemas/settings-schema';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { notificationSettingsService } from '@/server/services/notification-settings-service';
import type { SafeResult } from '@/types/safe-result-types';

export async function verifySmtpAction(
  input?: unknown,
): Promise<SafeResult<null>> {
  const session = await requireAuth();

  try {
    let settings = await notificationSettingsService.getOrCreate();

    if (input) {
      const parsed = updateNotificationSettingsSchema.safeParse(input);
      if (!parsed.success) {
        return {
          success: false,
          error: 'Ошибка валидации',
          fieldErrors: parsed.error.flatten().fieldErrors,
        };
      }

      const existing = await notificationSettingsService.getOrCreate();
      settings = {
        ...existing,
        ...parsed.data,
        smtpPassword: parsed.data.smtpPassword || existing.smtpPassword,
      };
    }

    const result = await verifySmtpConnection(settings);

    if (!result.success) {
      return { success: false, error: result.error ?? 'Не удалось подключиться' };
    }

    await auditlogService.log({
      action: 'editSettings',
      entityType: 'notificationSettings',
      displayName: 'Успешная проверка SMTP-соединения',
      adUsername: session.username,
    });

    return { success: true, data: null };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}

export async function sendTestEmailAction(input: {
  testEmail: string;
  settings?: unknown;
}): Promise<SafeResult<null>> {
  const session = await requireAuth();

  const parsed = testSmtpSchema.safeParse({ testEmail: input.testEmail });
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    let settings = await notificationSettingsService.getOrCreate();

    if (input.settings) {
      const settingsParsed = updateNotificationSettingsSchema.safeParse(
        input.settings,
      );
      if (!settingsParsed.success) {
        return {
          success: false,
          error: 'Ошибка валидации настроек SMTP',
          fieldErrors: settingsParsed.error.flatten().fieldErrors,
        };
      }

      const existing = await notificationSettingsService.getOrCreate();
      settings = {
        ...existing,
        ...settingsParsed.data,
        smtpPassword:
          settingsParsed.data.smtpPassword || existing.smtpPassword,
      };
    }

    const result = await sendTestEmail(parsed.data.testEmail, settings);

    if (!result.success) {
      return { success: false, error: result.error ?? 'Не удалось отправить' };
    }

    await auditlogService.log({
      action: 'sendNotification',
      entityType: 'notificationSettings',
      displayName: `Отправлено тестовое письмо на ${parsed.data.testEmail}`,
      adUsername: session.username,
    });

    return { success: true, data: null };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
