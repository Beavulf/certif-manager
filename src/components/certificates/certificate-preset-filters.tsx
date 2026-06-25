'use client';

import { cn } from '@/lib/utils';
import {
  CERTIFICATE_PRESETS,
  type CertificatePresetId,
} from '@/lib/certificate-presets';

type CertificatePresetFiltersProps = {
  activePreset: CertificatePresetId | null;
  counts: Record<CertificatePresetId, number>;
  onChange: (preset: CertificatePresetId | null) => void;
  className?: string;
};

export function CertificatePresetFilters({
  activePreset,
  counts,
  onChange,
  className,
}: CertificatePresetFiltersProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-xs font-medium text-muted-foreground">Быстрые фильтры:</span>
      {CERTIFICATE_PRESETS.map((preset) => {
        const isActive = activePreset === preset.id;
        const count = counts[preset.id];

        return (
          <button
            key={preset.id}
            type="button"
            title={preset.description}
            onClick={() => onChange(isActive ? null : preset.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              isActive
                ? 'border-amber-300 bg-amber-50 text-amber-900'
                : 'border-border/70 bg-background text-foreground hover:bg-accent/50',
            )}
          >
            {preset.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                isActive ? 'bg-amber-200/70' : 'bg-muted text-muted-foreground',
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
      {activePreset ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-medium text-amber-800 hover:underline"
        >
          Сбросить фильтр
        </button>
      ) : null}
    </div>
  );
}
