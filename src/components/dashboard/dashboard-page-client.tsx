'use client';

import { useEffect } from 'react';

import { DashboardActivityFeed } from '@/components/dashboard/dashboard-activity-feed';
import { DashboardAttentionList } from '@/components/dashboard/dashboard-attention-list';
import { DashboardEmployeeSearch } from '@/components/dashboard/dashboard-employee-search';
import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state';
import { DashboardKpiCards } from '@/components/dashboard/dashboard-kpi-cards';
import { DashboardProblemsPanel } from '@/components/dashboard/dashboard-problems-panel';
import { DashboardSystemPanel } from '@/components/dashboard/dashboard-system-panel';
import { useDashboard } from '@/hooks/use-dashboard';
import type { EmployeeListItem } from '@/lib/employee-table-utils';
import { showActionError } from '@/lib/toast-messages';
import type { DashboardData } from '@/types/dashboard-types';
import type { SafeResult } from '@/types/safe-result-types';

type DashboardPageClientProps = {
  initial: SafeResult<DashboardData>;
  initialEmployees?: SafeResult<EmployeeListItem[]>;
};

export function DashboardPageClient({
  initial,
  initialEmployees,
}: DashboardPageClientProps) {
  const initialData = initial.success ? initial.data : undefined;
  const { data, error } = useDashboard(initialData);
  const dashboard = data ?? initialData;

  useEffect(() => {
    if (!initial.success) {
      showActionError(initial, 'Загрузка обзора', 'Не удалось загрузить данные панели');
    }
  }, [initial]);

  useEffect(() => {
    if (error) {
      showActionError(error, 'Загрузка обзора', 'Не удалось обновить данные панели');
    }
  }, [error]);

  if (!dashboard) {
    return (
      <p className="text-sm text-muted-foreground">
        Не удалось загрузить данные для обзора.
      </p>
    );
  }

  const isEmpty = dashboard.kpi.totalCertificates === 0;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Здравствуйте,{' '}
        <span className="font-medium text-foreground">{dashboard.username}</span>.
        Краткая сводка по сертификатам и системе.
      </p>

      <DashboardKpiCards kpi={dashboard.kpi} />

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="flex min-w-0 flex-col gap-5">
          <DashboardEmployeeSearch
            initialEmployees={
              initialEmployees?.success ? initialEmployees.data : undefined
            }
          />
          {isEmpty ? (
            <DashboardEmptyState />
          ) : (
            <DashboardAttentionList items={dashboard.attentionCerts} />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <DashboardProblemsPanel problems={dashboard.problems} />
          <DashboardSystemPanel
            systemStatus={dashboard.systemStatus}
            notificationsEnabled={dashboard.notificationsEnabled}
          />
        </div>
      </section>

      <DashboardActivityFeed items={dashboard.recentActivity} />
    </div>
  );
}
