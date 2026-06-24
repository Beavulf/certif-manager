'use server';

import { checkExpiringCertificates } from '@/lib/notifications';
import { requireAuth } from '@/lib/session-helper';
import { runNotificationCheckSchema } from '@/schemas/notifications-schema';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import type { CheckExpiringResult } from '@/types/notification-check-types';
import type { SafeResult } from '@/types/safe-result-types';

export async function runNotificationCheckAction(
  input?: unknown,
): Promise<SafeResult<CheckExpiringResult>> {
  const session = await requireAuth();

  const parsed = runNotificationCheckSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { daysBeforeExpiry, ignoreAlreadySent, useTestDays } = parsed.data;

    const result = await checkExpiringCertificates({
      daysOverride: daysBeforeExpiry,
      ignoreAlreadySent,
      isTestRun: useTestDays ?? false,
      initiatedBy: 'manual',
      adUsername: session.username,
    });

    return { success: true, data: result };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
