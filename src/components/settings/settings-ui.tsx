'use client';

import { Tooltip } from 'antd';
import { CircleHelp } from 'lucide-react';

import { cn } from '@/lib/utils';

type SettingsLabelProps = {
  label: string;
  tooltip: string;
  htmlFor?: string;
  className?: string;
};

export function SettingsLabelWithTooltip({
  label,
  tooltip,
  htmlFor,
  className,
}: SettingsLabelProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Tooltip title={tooltip}>
        <button
          type="button"
          className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`Подсказка: ${label}`}
        >
          <CircleHelp className="size-3.5" />
        </button>
      </Tooltip>
    </div>
  );
}

type SettingsSectionCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function SettingsSectionCard({
  title,
  description,
  children,
  className,
}: SettingsSectionCardProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border/70 bg-card p-6 shadow-sm',
        className,
      )}
    >
      <div className="mb-5">
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
