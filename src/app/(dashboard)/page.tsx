import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardPageClient } from '@/components/dashboard/dashboard-page-client';
import { PageShell } from '@/components/dashboard/page-shell';
import { getDashboardAction } from '@/server/actions/dashboard/get-dashboard-action';

export default async function DashboardPage() {
  // Полный список сотрудников здесь не нужен: виджет поиска подтягивает его
  // на клиенте (useGetEmployeesPage), не блокируя первую отрисовку страницы.
  const initial = await getDashboardAction();

  return (
    <>
      <DashboardHeader
        title="Обзор"
        description="Сводка по сертификатам, срокам действия, проблемам и состоянию системы."
      />
      <PageShell wide>
        <DashboardPageClient initial={initial} />
      </PageShell>
    </>
  );
}
