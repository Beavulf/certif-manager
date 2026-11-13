'use server';

import { requireAuth } from '@/lib/session-helper';
import { getSystemStatus } from '@/lib/system-status';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import type { SystemStatus } from '@/types/settings-types';
import type { SafeResult } from '@/types/safe-result-types';

/** Свежие пробы БД/MinIO/cron в обход 30-секундного кэша статуса. */
export async function refreshSystemStatusAction(): Promise<
  SafeResult<SystemStatus>
> {
  await requireAuth();

  try {
    const systemStatus = await getSystemStatus(true);
    return { success: true, data: systemStatus };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
