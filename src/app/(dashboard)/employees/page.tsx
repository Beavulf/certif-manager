import { Suspense } from 'react';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { PageShell } from '@/components/dashboard/page-shell';
import { EmployeesPage } from '@/components/employees/employees-page';
import { getEmployeesPageAction } from '@/server/actions/employee/get-employees-page-action';

export default async function EmployeesRoutePage() {
  const initial = await getEmployeesPageAction();

  return (
    <>
      <DashboardHeader
        title="Сотрудники"
        description="Справочник сотрудников, привязка сертификатов и контактные данные для уведомлений."
      />
      <PageShell wide fill>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Загрузка…</p>}>
          <EmployeesPage initial={initial} />
        </Suspense>
      </PageShell>
    </>
  );
}
