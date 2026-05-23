import { FileBadge2, BellRing, ShieldAlert, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { PageShell } from '@/components/dashboard/page-shell';
import { getSessionUser } from '@/lib/session-helper';

export default async function DashboardPage() {
  const user = await getSessionUser();

  return (
    <>
      <DashboardHeader
        title="Обзор"
        description="Следи за сертификатами, сроками действия и новыми загрузками из одной рабочей панели."
      />

      <PageShell>
        <section className="grid grid-cols-3 gap-5">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Всего сертификатов
              </CardTitle>
              <FileBadge2 className="size-4 text-amber-700" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">0</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Пока список пуст. Начни с первой загрузки.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Скоро истекают
              </CardTitle>
              <ShieldAlert className="size-4 text-amber-700" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">0</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Нет сертификатов, требующих внимания.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Уведомления
              </CardTitle>
              <BellRing className="size-4 text-amber-700" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">0</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Система пока не отправляла напоминаний.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-[1.4fr_0.8fr] gap-5">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Начало работы
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-dashed border-border bg-accent/40 px-6 py-10 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                  <Upload className="size-6" />
                </div>

                <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                  Пока нет загруженных сертификатов
                </h2>

                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Добавь первый сертификат, чтобы начать отслеживать сроки действия,
                  историю загрузок и будущие уведомления.
                </p>

                <div className="mt-5 flex items-center justify-center gap-3">
                  <Button>
                    <Upload className="size-4" />
                    Загрузить сертификат
                  </Button>

                  <Button variant="outline">
                    Открыть список сертификатов
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Состояние аккаунта
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">
                  Пользователь
                </p>
                <p className="mt-2 font-medium text-foreground">
                  {user?.username ?? 'Неизвестно'}
                </p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">
                  Статус сессии
                </p>
                <p className="mt-2 font-medium text-foreground">
                  Авторизован
                </p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">
                  Режим
                </p>
                <p className="mt-2 font-medium text-foreground">
                  Desktop workspace
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </PageShell>
    </>
  );
}