'use client';

import { ChevronDown, ChevronUp, LayoutDashboard, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DASHBOARD_WIDGETS,
  type DashboardWidgetId,
} from '@/constants/dashboard-widgets';
import type { DashboardLayoutPrefs } from '@/hooks/use-dashboard-layout';
import { cn } from '@/lib/utils';

type DashboardLayoutSettingsProps = {
  prefs: DashboardLayoutPrefs;
  onToggleCollapsed: (id: DashboardWidgetId) => void;
  onMoveWidget: (id: DashboardWidgetId, direction: 'up' | 'down') => void;
  onReset: () => void;
};

export function DashboardLayoutSettings({
  prefs,
  onToggleCollapsed,
  onMoveWidget,
  onReset,
}: DashboardLayoutSettingsProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="cursor-pointer gap-2">
            <LayoutDashboard className="size-4" />
            Настроить панель
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border/70 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Вид обзора</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Порядок блоков и свёрнутые секции сохраняются в браузере
          </p>
        </div>

        <ul className="max-h-72 overflow-y-auto p-2">
          {DASHBOARD_WIDGETS.map((widget) => {
            const columnOrder = prefs.order[widget.column];
            const index = columnOrder.indexOf(widget.id);
            const isCollapsed = Boolean(prefs.collapsed[widget.id]);

            return (
              <li
                key={widget.id}
                className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-accent/40"
              >
                <button
                  type="button"
                  onClick={() => onToggleCollapsed(widget.id)}
                  className={cn(
                    'min-w-0 flex-1 text-left text-sm',
                    isCollapsed && 'text-muted-foreground',
                  )}
                >
                  {widget.label}
                  {isCollapsed ? (
                    <span className="ml-1.5 text-[11px] text-muted-foreground">
                      (свёрнут)
                    </span>
                  ) : null}
                </button>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 cursor-pointer"
                    disabled={index <= 0}
                    onClick={() => onMoveWidget(widget.id, 'up')}
                    title="Выше"
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 cursor-pointer"
                    disabled={index >= columnOrder.length - 1}
                    onClick={() => onMoveWidget(widget.id, 'down')}
                    title="Ниже"
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-border/70 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full cursor-pointer gap-2"
            onClick={onReset}
          >
            <RotateCcw className="size-4" />
            Сбросить по умолчанию
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
