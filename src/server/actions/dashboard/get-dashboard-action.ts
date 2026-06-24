'use server';

import {
  buildAttentionCertificates,
  computeDashboardKpi,
} from '@/lib/dashboard-utils';
import { DEFAULT_EXPIRY_THRESHOLDS } from '@/lib/certificate-expiry';
import { getSystemStatus } from '@/lib/system-status';
import { requireAuth } from '@/lib/session-helper';
import prisma from '@/lib/prisma';
import { mapErrorToSafeResult } from '@/server/errors/map-error';
import { auditlogService } from '@/server/services/auditlog-service';
import { certificateService } from '@/server/services/certificate-service';
import { notificationLogService } from '@/server/services/notification-log-service';
import { notificationSettingsService } from '@/server/services/notification-settings-service';
import { appSettingsService } from '@/server/services/app-settings-service';
import type { DashboardData } from '@/types/dashboard-types';
import type { SafeResult } from '@/types/safe-result-types';

function getSevenDaysAgo(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 7);
  return start;
}

export async function getDashboardAction(): Promise<SafeResult<DashboardData>> {
  const session = await requireAuth();

  try {
    const [
      appSettings,
      notificationSettings,
      systemStatus,
      certificates,
      notificationStats,
      failedNotifications7d,
      unassignedCertificates,
      employeesWithoutCertificates,
      recentAuditLogs,
    ] = await Promise.all([
      appSettingsService.getOrCreate(),
      notificationSettingsService.getOrCreate(),
      getSystemStatus(),
      certificateService.findMany({
        include: {
          employee: { select: { id: true, fullName: true } },
        },
        orderBy: { validTo: 'asc' },
      }),
      notificationLogService.getStats(),
      notificationLogService.count({
        where: {
          status: 'failed',
          sentAt: { gte: getSevenDaysAgo() },
        },
      }),
      prisma.certificate.count({ where: { employeeId: null } }),
      prisma.employee.count({
        where: {
          isActive: true,
          certificates: { none: {} },
        },
      }),
      auditlogService.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    const expiryThresholds = {
      warningDays: appSettings.warningDays,
      criticalDays: appSettings.criticalDays,
    };

    const kpi = computeDashboardKpi(certificates, expiryThresholds, {
      today: notificationStats.today,
      failed: notificationStats.failed,
    });

    const attentionCerts = buildAttentionCertificates(
      certificates,
      expiryThresholds,
      10,
    );

    return {
      success: true,
      data: {
        kpi,
        attentionCerts,
        problems: {
          unassignedCertificates,
          employeesWithoutCertificates,
          failedNotifications7d,
        },
        recentActivity: recentAuditLogs.map((log) => ({
          id: log.id,
          createdAt: log.createdAt,
          adUsername: log.adUsername,
          action: log.action,
          displayName: log.displayName,
        })),
        systemStatus,
        notificationsEnabled: notificationSettings.isEnabled,
        expiryThresholds:
          expiryThresholds.warningDays || expiryThresholds.criticalDays
            ? expiryThresholds
            : DEFAULT_EXPIRY_THRESHOLDS,
        username: session.username,
      },
    };
  } catch (error) {
    return mapErrorToSafeResult(error);
  }
}
