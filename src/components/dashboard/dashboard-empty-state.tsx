'use client';

import { FileBadge2, Settings, Upload, Users } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STEPS = [
  {
    icon: Upload,
    title: 'Загрузите сертификат',
    description: 'На странице «Сертификаты» через кнопку загрузки',
    href: '/certificates',
  },
  {
    icon: Users,
    title: 'Привяжите сотрудника',
    description: 'Чтобы уходили email-напоминания об истечении',
    href: '/employees',
  },
  {
    icon: Settings,
    title: 'Настройте SMTP',
    description: 'В разделе «Настройки» → «Уведомления»',
    href: '/settings',
  },
];

export function DashboardEmptyState() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="border-b border-border/70 px-6 py-4">
        <CardTitle className="text-base font-semibold">Начало работы</CardTitle>
      </CardHeader>

      <CardContent className="px-6 py-8">
        <div className="rounded-2xl border border-dashed border-border bg-accent/30 px-6 py-10 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
            <FileBadge2 className="size-6" />
          </div>

          <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
            Пока нет загруженных сертификатов
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Добавьте первый сертификат, чтобы начать отслеживать сроки действия,
            привязку к сотрудникам и автоматические уведомления.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href="/certificates">
                <Upload className="size-4" />
                Перейти к сертификатам
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/settings">Настроить уведомления</Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.title}
                href={step.href}
                className="rounded-xl border border-border/70 bg-background/80 px-4 py-4 transition-colors hover:border-amber-200/80 hover:bg-amber-50/40"
              >
                <div className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-amber-700">
                  <Icon className="size-4" />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {step.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
