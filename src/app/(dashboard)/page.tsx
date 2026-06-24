import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardPageClient } from '@/components/dashboard/dashboard-page-client';
import { PageShell } from '@/components/dashboard/page-shell';
import { getDashboardAction } from '@/server/actions/dashboard/get-dashboard-action';
import { getEmployeesPageAction } from '@/server/actions/employee/get-employees-page-action';

export default async function DashboardPage() {
  const [initial, initialEmployees] = await Promise.all([
    getDashboardAction(),
    getEmployeesPageAction(),
  ]);

  return (
    <>
      <DashboardHeader
        title="Обзор"
        description="Сводка по сертификатам, срокам действия, проблемам и состоянию системы."
      />
      <PageShell wide>
        <DashboardPageClient
          initial={initial}
          initialEmployees={initialEmployees}
        />
      </PageShell>
    </>
  );
}
