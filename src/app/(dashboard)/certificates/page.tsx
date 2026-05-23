import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PageShell } from "@/components/dashboard/page-shell";
import { CertificatesPage } from "@/components/certificates/certificate-page";

export default async function Home() {
  return (
    <>
      <DashboardHeader
        title="Сертификаты"
        description="Загружай, просматривай и управляем сертификатами."
      />
      <PageShell>
        <CertificatesPage/>
      </PageShell>
    </>
  );
}
