'use client';

import { AlertTriangle, CheckCircle2, Clock3, FileBadge2 } from 'lucide-react';

import type { CertificateStats } from '@/lib/certificate-table-utils';
import { cn } from '@/lib/utils';

type CertificatesStatsProps = {
  stats: CertificateStats;
  loading?: boolean;
};

const ITEMS = [
  {
    key: 'total',
    label: 'Всего',
    icon: FileBadge2,
    className: 'border-border/70 bg-card text-foreground',
    iconClassName: 'text-amber-700',
  },
  {
    key: 'active',
    label: 'Активны',
    icon: CheckCircle2,
    className: 'border-emerald-200/80 bg-emerald-50/60 text-emerald-900',
    iconClassName: 'text-emerald-700',
  },
  {
    key: 'expiringSoon',
    label: 'Скоро истекают',
    icon: Clock3,
    className: 'border-amber-200/80 bg-amber-50/60 text-amber-900',
    iconClassName: 'text-amber-700',
  },
  {
    key: 'expired',
    label: 'Истекли',
    icon: AlertTriangle,
    className: 'border-red-200/80 bg-red-50/60 text-red-900',
    iconClassName: 'text-red-700',
  },
] as const;

export function CertificatesStats({ stats, loading = false }: CertificatesStatsProps) {
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
