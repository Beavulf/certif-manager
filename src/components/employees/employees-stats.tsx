'use client';

import { CheckCircle2, UserRound, UserRoundX, Users } from 'lucide-react';

import type { EmployeeStats } from '@/lib/employee-table-utils';
import { cn } from '@/lib/utils';

type EmployeesStatsProps = {
  stats: EmployeeStats;
  loading?: boolean;
};

const ITEMS = [
  {
    key: 'total' as const,
    label: 'Всего',
    icon: Users,
    className: 'border-border/70 bg-card text-foreground',
    iconClassName: 'text-amber-700',
  },
  {
    key: 'active' as const,
    label: 'Активны',
    icon: CheckCircle2,
    className: 'border-emerald-200/80 bg-emerald-50/60 text-emerald-900',
    iconClassName: 'text-emerald-700',
  },
  {
    key: 'withCertificates' as const,
    label: 'С сертификатами',
    icon: UserRound,
    className: 'border-amber-200/80 bg-amber-50/60 text-amber-900',
    iconClassName: 'text-amber-700',
  },
  {
    key: 'withoutCertificates' as const,
    label: 'Без сертификатов',
    icon: UserRoundX,
    className: 'border-red-200/80 bg-red-50/60 text-red-900',
    iconClassName: 'text-red-700',
  },
];

export function EmployeesStats({ stats, loading = false }: EmployeesStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const value = stats[item.key];

        return (
          <div
            key={item.key}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm transition-opacity',
              item.className,
              loading && 'opacity-60',
            )}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background/70">
              <Icon className={cn('size-4', item.iconClassName)} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-xl font-semibold tracking-tight">{value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
