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
    label: 'Всего',
    hint: 'В системе',
    icon: FileBadge2,
    href: '/certificates',
    className: 'border-border/70 bg-card text-foreground',
    iconClassName: 'text-amber-700',
  },
  {
    key: 'expiringSoon' as const,
    label: 'Скоро истекают',
    hint: 'Актуальный сертификат',
    icon: ShieldAlert,
    href: '/certificates?preset=expiring',
    className: 'border-amber-200/80 bg-amber-50/60 text-amber-900',
    iconClassName: 'text-amber-700',
  },
  {
    key: 'expired' as const,
    label: 'Без действующего',
    hint: 'Нужна загрузка',
    icon: AlertTriangle,
    href: '/certificates?preset=expired',
    className: 'border-red-200/80 bg-red-50/60 text-red-900',
    iconClassName: 'text-red-700',
  },
  {
    key: 'notificationsToday' as const,
    label: 'Уведомления',
    hintKey: 'notificationsFailed' as const,
    hintSuffix: 'с ошибкой',
    icon: BellRing,
    href: '/notifications?period=today',
    failedHref: '/notifications?status=failed',
    className: 'border-border/70 bg-card text-foreground',
    iconClassName: 'text-amber-700',
  },
];

export function DashboardKpiCards({ kpi }: DashboardKpiCardsProps) {
  const hasFailedNotifications = kpi.notificationsFailed > 0;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = kpi[card.key];
        const isNotificationsCard = card.key === 'notificationsToday';
        const hint =
          isNotificationsCard
            ? `${kpi.notificationsFailed} ${card.hintSuffix}`
            : card.hint;
        const href =
          isNotificationsCard && hasFailedNotifications && 'failedHref' in card
            ? card.failedHref
            : card.href;

        return (
          <Link
            key={card.key}
            href={href}
            className={cn(
              'group flex items-center gap-2.5 rounded-lg border px-3 py-2 shadow-sm transition-all',
              'hover:-translate-y-0.5 hover:shadow-md',
              card.className,
            )}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background/70 transition-colors group-hover:bg-background">
              <Icon className={cn('size-3.5', card.iconClassName)} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] text-muted-foreground">{card.label}</p>
              <p className="text-lg font-semibold leading-tight tracking-tight">{value}</p>
              <p
                className={cn(
                  'truncate text-[10px]',
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
