import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { PageShell } from '@/components/dashboard/page-shell';
import { NotificationsPage } from '@/components/notifications/notifications-page';
import { getNotificationLogsPageAction } from '@/server/actions/notifications/get-notification-logs-page-action';

export default async function NotificationsRoutePage() {
  const result = await getNotificationLogsPageAction({
    page: 1,
    pageSize: 25,
    status: 'all',
    period: 'all',
  });

  if (!result.success || !result.data) {
    return (
      <>
        <DashboardHeader
          title="Уведомления"
          description="Журнал отправленных email-напоминаний об истечении сертификатов."
        />
        <PageShell wide>
          <p className="text-sm text-red-600">
            {result.error ?? 'Не удалось загрузить уведомления'}
          </p>
        </PageShell>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Уведомления"
        description="Журнал отправленных email-напоминаний, фильтры и ручной запуск проверки."
      />
      <PageShell wide>
        <NotificationsPage initial={result.data} />
      </PageShell>
    </>
  );
}
