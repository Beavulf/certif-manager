'use client';

import {
  AlertTriangle,
  BellRing,
  Link2Off,
  UserRoundX,
} from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DashboardProblems } from '@/types/dashboard-types';

type DashboardProblemsPanelProps = {
  problems: DashboardProblems;
};

const ITEMS = [
  {
    key: 'unassignedCertificates' as const,
    label: 'Без привязки к сотруднику',
    description: 'Уведомления могут не отправиться',
    icon: Link2Off,
    href: '/certificates?preset=unassigned',
    warnIfPositive: true,
  },
  {
    key: 'employeesWithoutCertificates' as const,
    label: 'Сотрудники без сертификатов',
    description: 'Активные записи без сертификатов',
    icon: UserRoundX,
    href: '/employees?preset=no-certs',
    warnIfPositive: true,
  },
  {
    key: 'failedNotifications7d' as const,
    label: 'Ошибки email за 7 дней',
    description: 'Неудачные отправки напоминаний',
    icon: BellRing,
    href: '/notifications?status=failed&period=7d',
    warnIfPositive: true,
  },
] as const;

export function DashboardProblemsPanel({ problems }: DashboardProblemsPanelProps) {
  const hasIssues = ITEMS.some((item) => problems[item.key] > 0);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="border-b border-border/70 px-5 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={cn(
              'size-4',
              hasIssues ? 'text-amber-700' : 'text-muted-foreground',
            )}
          />
          <CardTitle className="text-base font-semibold">Проблемы</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 p-4">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const count = problems[item.key];
          const isWarning = item.warnIfPositive && count > 0;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors',
                isWarning
                  ? 'border-amber-200/80 bg-amber-50/50 hover:bg-amber-50'
                  : 'border-border/70 bg-background/60 hover:bg-accent/40',
              )}
            >
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background/80',
                  isWarning
                    ? 'border-amber-200 text-amber-700'
                    : 'border-border/70 text-muted-foreground',
                )}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {item.label}
                  </p>
                  <span
                    className={cn(
                      'text-lg font-semibold tabular-nums',
                      isWarning ? 'text-amber-800' : 'text-foreground',
                    )}
                  >
                    {count}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}

        {!hasIssues && (
          <p className="px-1 pt-1 text-center text-xs text-muted-foreground">
            Критичных проблем не обнаружено
          </p>
        )}
      </CardContent>
    </Card>
  );
}
