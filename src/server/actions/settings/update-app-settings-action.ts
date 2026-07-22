'use server';

import { rescheduleCronJobs } from '@/lib/cron';
import { requireAuth } from '@/lib/session-helper';
import { getSystemStatus } from '@/lib/system-status';
import { updateAppSettingsSchema } from '@/schemas/settings-schema';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { appSettingsService } from '@/server/services/app-settings-service';
import { AUDIT_ENTITY } from '@/types/auditlog-types';
import prisma from '@/lib/prisma';
import type { AppSettings } from '@/generated/prisma/client';
import type { SystemStatus } from '@/types/settings-types';
import type { SafeResult } from '@/types/safe-result-types';

export type UpdateAppSettingsResult = {
  app: AppSettings;
  systemStatus: SystemStatus;
};

export async function updateAppSettingsAction(
  input: unknown,
): Promise<SafeResult<UpdateAppSettingsResult>> {
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

    const nextWarningDays = data.warningDays ?? previous.warningDays;
    const nextCriticalDays = data.criticalDays ?? previous.criticalDays;
    if (nextCriticalDays > nextWarningDays) {
      return {
        success: false,
        error: 'Критический порог не может быть больше порога предупреждения',
        fieldErrors: {
          criticalDays: [
            'Критический порог не может быть больше порога предупреждения',
          ],
        },
      };
    }

    const patch: Parameters<typeof appSettingsService.update>[0] = {};

    if (data.appName !== undefined) patch.appName = data.appName;
    if (data.organizationName !== undefined) {
      patch.organizationName = data.organizationName || null;
    }
    if (data.timezone !== undefined) patch.timezone = data.timezone;
    if (data.warningDays !== undefined) patch.warningDays = data.warningDays;
    if (data.criticalDays !== undefined) patch.criticalDays = data.criticalDays;
    if (data.maxFileSizeMb !== undefined) patch.maxFileSizeMb = data.maxFileSizeMb;
    if (data.allowedCertTypes !== undefined) {
      patch.allowedCertTypes = data.allowedCertTypes;
    }
    if (data.allowedDocTypes !== undefined) {
      patch.allowedDocTypes = data.allowedDocTypes;
    }
    if (data.cronCheckTime !== undefined) {
      patch.cronCheckTime = data.cronCheckTime;
    }
    if (data.adEmailDomain !== undefined) {
      patch.adEmailDomain = data.adEmailDomain?.trim() || null;
    }
    if (data.auditLogRetentionDays !== undefined) {
      patch.auditLogRetentionDays = data.auditLogRetentionDays;
    }

    const updated = await appSettingsService.update(patch, username);

    if (
      data.auditLogRetentionDays !== undefined &&
      data.auditLogRetentionDays !== previous.auditLogRetentionDays
    ) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - data.auditLogRetentionDays);
      await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
    }

    const shouldReschedule =
      (data.cronCheckTime !== undefined &&
        data.cronCheckTime !== previous.cronCheckTime) ||
      (data.timezone !== undefined && data.timezone !== previous.timezone);

    if (shouldReschedule) {
      try {
        await rescheduleCronJobs();
      } catch (error) {
        console.error('[CRON] Failed to reschedule after settings update:', error);
      }
    }

    await auditlogService.log({
      action: 'editSettings',
      entityType: AUDIT_ENTITY.appSettings,
      entityId: updated.id,
      displayName: 'Обновлены общие настройки приложения',
      adUsername: username,
    });

    const systemStatus = await getSystemStatus();

    return { success: true, data: { app: updated, systemStatus } };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
