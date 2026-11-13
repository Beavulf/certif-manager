import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { PageShell } from '@/components/dashboard/page-shell';
import { RetryButton } from '@/components/settings/retry-button';
import { SettingsPageClient } from '@/components/settings/settings-page-client';
import { getSettingsAction } from '@/server/actions/settings/get-settings-action';

export default async function SettingsPage() {
  const result = await getSettingsAction();

  if (!result.success || !result.data) {
    return (
      <>
        <DashboardHeader
          title="Настройки"
          description="Не удалось загрузить настройки приложения."
        />
        <PageShell>
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-red-600">
              {result.error ?? 'Ошибка загрузки настроек'}
            </p>
            <RetryButton />
          </div>
        </PageShell>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Настройки"
        description="Конфигурация уведомлений, порогов срочности, загрузки файлов и журнала аудита."
      />
      <PageShell wide>
        <SettingsPageClient initial={result.data} />
      </PageShell>
    </>
  );
}
