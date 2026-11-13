'use server';

import type { Prisma } from '@/generated/prisma/client';
import { requireAuth } from '@/lib/session-helper';
import { auditLogsQuerySchema } from '@/schemas/settings-schema';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import type { AuditLogsWithIncludes } from '@/types/auditlog-types';
import type { SafeResult } from '@/types/safe-result-types';

export type AuditLogsPage = {
  items: AuditLogsWithIncludes[];
  total: number;
  page: number;
  pageSize: number;
};

export async function getAuditLogsAction(
  input?: unknown,
): Promise<SafeResult<AuditLogsPage>> {
  await requireAuth();

  const parsed = auditLogsQuerySchema.safeParse(input ?? {});
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { page, pageSize, action, search } = parsed.data;
  const skip = (page - 1) * pageSize;

  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action } : {}),
    ...(search
      ? {
          OR: [
            { adUsername: { contains: search, mode: 'insensitive' } },
            { displayName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  try {
    const [items, total] = await Promise.all([
      auditlogService.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { user: true },
      }),
      auditlogService.count({ where }),
    ]);

    return {
      success: true,
      data: { items, total, page, pageSize },
    };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
