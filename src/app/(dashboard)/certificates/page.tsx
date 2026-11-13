import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PageShell } from "@/components/dashboard/page-shell";
import { CertificatesPage } from "@/components/certificates/certificate-page";
import { getCertificatesByFindMany } from "@/server/actions/certificate/get-certificate-action";
import type { Certificate } from "@/generated/prisma/client";
import type { SafeResult } from "@/types/safe-result-types";

export default async function Home() {
  const init = await getCertificatesByFindMany({
    include: {
      employee: { select: { id: true, fullName: true } },
      _count: { select: { documents: true } },
    },
    orderBy: { uploadedAt: 'desc' },
  }) as SafeResult<Certificate[]>;

  return (
    <>
      <DashboardHeader
        title="Сертификаты"
        description="Загружай, просматривай и управляем сертификатами."
      />
      <PageShell wide fill>
        <CertificatesPage initial={init}/>
      </PageShell>
    </>
  );
}
