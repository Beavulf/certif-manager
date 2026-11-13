'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileBadge2,
  Paperclip,
  ShieldBan,
  UserRoundX,
} from 'lucide-react';

import type { CertificatePresetId } from '@/lib/certificate-presets';
import { cn } from '@/lib/utils';

type CertificatesStatsProps = {
  /** Всего сертификатов в системе (без учёта активного фильтра). */
  total: number;
  /** Счётчики всех фильтров по полному списку. */
  presetCounts: Record<CertificatePresetId, number>;
  activePreset: CertificatePresetId | null;
  onSelectPreset: (preset: CertificatePresetId | null) => void;
  loading?: boolean;
};

// Каждая карточка — переключатель фильтра: presetId === null — «Всего», сбрасывает фильтр.
const ITEMS = [
  {
    key: 'total',
    label: 'Всего',
    icon: FileBadge2,
    presetId: null,
    className: 'border-border/70 bg-card text-foreground',
    iconClassName: 'text-amber-700',
  },
  {
    key: 'active',
    label: 'Активны',
    icon: CheckCircle2,
    presetId: 'active' as CertificatePresetId,
    className: 'border-emerald-200/80 bg-emerald-50/60 text-emerald-900',
    iconClassName: 'text-emerald-700',
  },
  {
    key: 'expiringSoon',
    label: 'Скоро истекают',
    icon: Clock3,
    presetId: 'expiring' as CertificatePresetId,
    className: 'border-amber-200/80 bg-amber-50/60 text-amber-900',
    iconClassName: 'text-amber-700',
  },
  {
    key: 'expired',
    label: 'Истекли',
    icon: AlertTriangle,
    presetId: 'expired' as CertificatePresetId,
    className: 'border-red-200/80 bg-red-50/60 text-red-900',
    iconClassName: 'text-red-700',
  },
  {
    key: 'revoked',
    label: 'Отозваны',
    icon: ShieldBan,
    presetId: 'revoked' as CertificatePresetId,
    className: 'border-slate-200/80 bg-slate-50/80 text-slate-900',
    iconClassName: 'text-slate-600',
  },
  {
    key: 'unassigned',
    label: 'Без сотрудника',
    icon: UserRoundX,
    presetId: 'unassigned' as CertificatePresetId,
    className: 'border-border/70 bg-card text-foreground',
    iconClassName: 'text-amber-700',
  },
  {
    key: 'no-docs',
    label: 'Без документов',
    icon: Paperclip,
    presetId: 'no-docs' as CertificatePresetId,
    className: 'border-border/70 bg-card text-foreground',
    iconClassName: 'text-amber-700',
  },
] as const;

export function CertificatesStats({
  total,
  presetCounts,
  activePreset,
  onSelectPreset,
  loading = false,
}: CertificatesStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const value = item.presetId ? presetCounts[item.presetId] : total;
        const isActive = activePreset === item.presetId;

        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelectPreset(item.presetId)}
            className={cn(
              'group flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 shadow-sm transition-all',
              'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400',
              item.className,
              isActive && 'ring-2 ring-amber-300 ring-offset-2 ring-offset-background',
              loading && 'opacity-60',
            )}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background/70 transition-colors group-hover:bg-background">
              <Icon className={cn('size-4', item.iconClassName)} />
            </div>
            <div className="min-w-0 text-left">
              <p className="truncate text-xs text-muted-foreground">{item.label}</p>
              <p className="text-xl font-semibold tracking-tight tabular-nums">{value}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
