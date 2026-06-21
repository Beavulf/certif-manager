'use client';

import { AlertTriangle, BellRing, CheckCircle2, Clock3 } from 'lucide-react';

import type { NotificationStats } from '@/lib/notification-log-filters';
import { cn } from '@/lib/utils';

type NotificationsStatsProps = {
  stats: NotificationStats;
  loading?: boolean;
};

const ITEMS = [
  {
    key: 'total' as const,
    label: 'Всего отправок',
    icon: BellRing,
    className: 'border-border/70 bg-card text-foreground',
    iconClassName: 'text-amber-700',
  },
  {
    key: 'sent' as const,
    label: 'Успешно',
    icon: CheckCircle2,
    className: 'border-emerald-200/80 bg-emerald-50/60 text-emerald-900',
    iconClassName: 'text-emerald-700',
  },
  {
    key: 'failed' as const,
    label: 'С ошибкой',
    icon: AlertTriangle,
    className: 'border-red-200/80 bg-red-50/60 text-red-900',
    iconClassName: 'text-red-700',
  },
  {
    key: 'today' as const,
    label: 'Сегодня',
    icon: Clock3,
    className: 'border-amber-200/80 bg-amber-50/60 text-amber-900',
    iconClassName: 'text-amber-700',
  },
];

export function NotificationsStats({ stats, loading = false }: NotificationsStatsProps) {
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
