'use server';

import { rescheduleCronJobs } from '@/lib/cron';
import { requireAuth } from '@/lib/session-helper';
import { updateAppSettingsSchema } from '@/schemas/settings-schema';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { appSettingsService } from '@/server/services/app-settings-service';
import prisma from '@/lib/prisma';
import type { AppSettings } from '@/generated/prisma/client';
import type { SafeResult } from '@/types/safe-result-types';

export async function updateAppSettingsAction(
  input: unknown,
): Promise<SafeResult<AppSettings>> {
  const session = await requireAuth();
  const username = session.username;

  const parsed = updateAppSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const previous = await appSettingsService.getOrCreate();
    const data = parsed.data;

    const updated = await appSettingsService.update(
      {
        appName: data.appName,
        organizationName: data.organizationName || null,
        timezone: data.timezone,
        warningDays: data.warningDays,
        criticalDays: data.criticalDays,
        maxFileSizeMb: data.maxFileSizeMb,
        allowedCertTypes: data.allowedCertTypes,
        allowedDocTypes: data.allowedDocTypes,
        cronCheckTime: data.cronCheckTime,
        adEmailDomain: data.adEmailDomain?.trim() || null,
        auditLogRetentionDays: data.auditLogRetentionDays,
      },
      username,
    );

    if (data.auditLogRetentionDays !== previous.auditLogRetentionDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - data.auditLogRetentionDays);
      await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
    }

    if (
      data.cronCheckTime !== previous.cronCheckTime ||
      data.timezone !== previous.timezone
    ) {
      await rescheduleCronJobs();
    }

    await auditlogService.log({
      action: 'editSettings',
      entityType: 'appSettings',
      entityId: updated.id,
      displayName: 'Обновлены общие настройки приложения',
      adUsername: username,
    });

    return { success: true, data: updated };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
