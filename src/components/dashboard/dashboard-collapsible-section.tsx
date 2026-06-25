'use client';

import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { DashboardWidgetId } from '@/constants/dashboard-widgets';

type DashboardCollapsibleSectionProps = {
  widgetId: DashboardWidgetId;
  title: string;
  collapsed: boolean;
  onToggle: (id: DashboardWidgetId) => void;
  headerAside?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DashboardCollapsibleSection({
  widgetId,
  title,
  collapsed,
  onToggle,
  headerAside,
  children,
  className,
}: DashboardCollapsibleSectionProps) {
  return (
    <section className={cn('min-w-0 shrink-0', className)}>
      <button
        type="button"
        onClick={() => onToggle(widgetId)}
        className="mb-1.5 flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-accent/50"
        aria-expanded={!collapsed}
      >
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            collapsed && '-rotate-90',
          )}
        />
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
          {title}
        </span>
        {headerAside ? (
          <span className="ml-auto" onClick={(e) => e.stopPropagation()}>
            {headerAside}
          </span>
        ) : null}
      </button>

      {!collapsed ? children : null}
    </section>
  );
}
