'use client';

import { useEffect, useMemo, type ReactNode } from 'react';

import { DashboardActivityFeed } from '@/components/dashboard/dashboard-activity-feed';
import { DashboardAttentionList } from '@/components/dashboard/dashboard-attention-list';
import { DashboardCollapsibleSection } from '@/components/dashboard/dashboard-collapsible-section';
import { DashboardEmployeeSearch } from '@/components/dashboard/dashboard-employee-search';
import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state';
import { DashboardExpiryCalendarPanel } from '@/components/dashboard/dashboard-expiry-calendar';
import { DashboardKpiCards } from '@/components/dashboard/dashboard-kpi-cards';
import { DashboardLayoutSettings } from '@/components/dashboard/dashboard-layout-settings';
import { DashboardProblemsPanel } from '@/components/dashboard/dashboard-problems-panel';
import { DashboardQuickActions } from '@/components/dashboard/dashboard-quick-actions';
import { DashboardSystemPanel } from '@/components/dashboard/dashboard-system-panel';
import { DASHBOARD_WIDGETS, type DashboardWidgetId } from '@/constants/dashboard-widgets';
import { useDashboard } from '@/hooks/use-dashboard';
import { useDashboardLayout } from '@/hooks/use-dashboard-layout';
import { showActionError } from '@/lib/toast-messages';
import { FadeIn } from '@/components/ui/fade-in';
import type { DashboardData } from '@/types/dashboard-types';
import type { SafeResult } from '@/types/safe-result-types';

type DashboardPageClientProps = {
  initial: SafeResult<DashboardData>;
};

function getWidgetLabel(id: DashboardWidgetId): string {
  return DASHBOARD_WIDGETS.find((widget) => widget.id === id)?.label ?? id;
}

export function DashboardPageClient({
  initial,
}: DashboardPageClientProps) {
  const initialData = initial.success ? initial.data : undefined;
  const { data, error } = useDashboard(initialData);
  const dashboard = data ?? initialData;
  const { prefs, toggleCollapsed, moveWidget, resetLayout } = useDashboardLayout();

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

  const widgetContent = useMemo(() => {
    if (!dashboard) return null;

    const isEmpty = dashboard.kpi.totalCertificates === 0;

    return {
      'employee-search': <DashboardEmployeeSearch />,
      'expiry-calendar': (
        <DashboardExpiryCalendarPanel calendar={dashboard.expiryCalendar} />
      ),
      attention: isEmpty ? (
        <DashboardEmptyState />
      ) : (
        <DashboardAttentionList items={dashboard.attentionCerts} />
      ),
      problems: <DashboardProblemsPanel problems={dashboard.problems} />,
      system: (
        <DashboardSystemPanel
          systemStatus={dashboard.systemStatus}
          notificationsEnabled={dashboard.notificationsEnabled}
        />
      ),
      activity: <DashboardActivityFeed items={dashboard.recentActivity} />,
    } satisfies Record<DashboardWidgetId, ReactNode>;
  }, [dashboard]);

  if (!dashboard || !widgetContent) {
    return (
      <p className="text-sm text-muted-foreground">
        Не удалось загрузить данные для обзора.
      </p>
    );
  }

  const renderColumn = (column: 'main' | 'side') =>
    prefs.order[column].map((widgetId, index) => (
      <FadeIn key={widgetId} delay={index * 0.05}>
        <DashboardCollapsibleSection
          widgetId={widgetId}
          title={getWidgetLabel(widgetId)}
          collapsed={Boolean(prefs.collapsed[widgetId])}
          onToggle={toggleCollapsed}
        >
          {widgetContent[widgetId]}
        </DashboardCollapsibleSection>
      </FadeIn>
    ));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Здравствуйте,{' '}
          <span className="font-medium text-foreground">{dashboard.username}</span>.
          Краткая сводка по сертификатам и системе.
        </p>
        <DashboardLayoutSettings
          prefs={prefs}
          onToggleCollapsed={toggleCollapsed}
          onMoveWidget={moveWidget}
          onReset={resetLayout}
        />
      </div>

      <DashboardQuickActions notificationsEnabled={dashboard.notificationsEnabled} />

      <DashboardKpiCards kpi={dashboard.kpi} />

      <section className="grid items-start gap-4 xl:grid-cols-[1.45fr_0.85fr] xl:gap-5">
        <div className="flex min-w-0 flex-col gap-4">{renderColumn('main')}</div>
        <div className="flex min-w-0 flex-col gap-4">{renderColumn('side')}</div>
      </section>

      {prefs.order.full.map((widgetId, index) => (
        <FadeIn key={widgetId} delay={index * 0.05}>
          <DashboardCollapsibleSection
            widgetId={widgetId}
            title={getWidgetLabel(widgetId)}
            collapsed={Boolean(prefs.collapsed[widgetId])}
            onToggle={toggleCollapsed}
          >
            {widgetContent[widgetId]}
          </DashboardCollapsibleSection>
        </FadeIn>
      ))}
    </div>
  );
}
