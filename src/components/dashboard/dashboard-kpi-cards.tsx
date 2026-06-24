'use client';

import {
  AlertTriangle,
  BellRing,
  FileBadge2,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

import type { DashboardKpi } from '@/types/dashboard-types';
import { cn } from '@/lib/utils';

type DashboardKpiCardsProps = {
  kpi: DashboardKpi;
};

const CARDS = [
  {
    key: 'totalCertificates' as const,
    label: 'Всего сертификатов',
    hint: 'В системе',
    icon: FileBadge2,
    href: '/certificates',
    className: 'border-border/70 bg-card text-foreground',
    iconClassName: 'text-amber-700',
  },
  {
    key: 'expiringSoon' as const,
    label: 'Скоро истекают',
    hint: 'Сотрудников · актуальный сертификат',
    icon: ShieldAlert,
    href: '/certificates',
    className: 'border-amber-200/80 bg-amber-50/60 text-amber-900',
    iconClassName: 'text-amber-700',
  },
  {
    key: 'expired' as const,
    label: 'Без действующего',
    hint: 'Нужна новая загрузка',
    icon: AlertTriangle,
    href: '/certificates',
    className: 'border-red-200/80 bg-red-50/60 text-red-900',
    iconClassName: 'text-red-700',
  },
  {
    key: 'notificationsToday' as const,
    label: 'Уведомления сегодня',
    hintKey: 'notificationsFailed' as const,
    hintSuffix: 'с ошибкой всего',
    icon: BellRing,
    href: '/notifications',
    className: 'border-border/70 bg-card text-foreground',
    iconClassName: 'text-amber-700',
  },
];

export function DashboardKpiCards({ kpi }: DashboardKpiCardsProps) {
  const hasFailedNotifications = kpi.notificationsFailed > 0;

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = kpi[card.key];
        const isNotificationsCard = card.key === 'notificationsToday';
        const hint =
          isNotificationsCard
            ? `${kpi.notificationsFailed} ${card.hintSuffix}`
            : card.hint;

        return (
          <Link
            key={card.key}
            href={card.href}
            className={cn(
              'group flex items-center gap-3 rounded-xl border px-4 py-3.5 shadow-sm transition-all',
              'hover:-translate-y-0.5 hover:shadow-md',
              card.className,
            )}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background/70 transition-colors group-hover:bg-background">
              <Icon className={cn('size-4', card.iconClassName)} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-semibold tracking-tight">{value}</p>
              <p
                className={cn(
                  'mt-0.5 truncate text-[11px]',
                  isNotificationsCard && hasFailedNotifications
                    ? 'font-medium text-red-600'
                    : 'text-muted-foreground/90',
                )}
              >
                {hint}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
