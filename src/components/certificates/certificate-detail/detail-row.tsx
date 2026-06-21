'use client';

import type { ComponentType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { CopyButton } from './copy-button';

export function DetailRow({
  icon: Icon,
  label,
  value,
  copyValue,
  mono = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  copyValue?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-2.5 py-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 flex items-start gap-1">
          <p
            className={cn(
              'min-w-0 flex-1 text-sm font-medium text-foreground break-words',
              mono && 'font-mono text-xs',
            )}
          >
            {value}
          </p>
          {copyValue ? <CopyButton value={copyValue} label={`${label} скопирован`} /> : null}
        </div>
      </div>
    </div>
  );
}
