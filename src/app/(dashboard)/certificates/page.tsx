import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getSessionUser } from "@/lib/session-helper";
import { PageShell } from "@/components/dashboard/page-shell";
import MyForm from '@/app/Form'

export default async function Home() {
  const user = await getSessionUser();

  return (
    <>
      <DashboardHeader
        username={user?.username ?? 'Пользователь'}
        title="Сертификаты"
        description="Загружай, просматривай и управляем сертификатами."
      />
      <PageShell>
        <MyForm/>
      </PageShell>
    </>
  );
}
