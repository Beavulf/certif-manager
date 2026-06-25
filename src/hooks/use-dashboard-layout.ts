'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  DASHBOARD_LAYOUT_STORAGE_KEY,
  DASHBOARD_WIDGET_IDS,
  DEFAULT_DASHBOARD_ORDER,
  type DashboardWidgetColumn,
  type DashboardWidgetId,
} from '@/constants/dashboard-widgets';

export type DashboardLayoutPrefs = {
  order: Record<DashboardWidgetColumn, DashboardWidgetId[]>;
  collapsed: Partial<Record<DashboardWidgetId, boolean>>;
};

function sanitizeOrder(
  order: Record<DashboardWidgetColumn, DashboardWidgetId[]>,
): Record<DashboardWidgetColumn, DashboardWidgetId[]> {
  const columns: DashboardWidgetColumn[] = ['main', 'side', 'full'];
  const result = { ...DEFAULT_DASHBOARD_ORDER };

  for (const column of columns) {
    const seen = new Set<DashboardWidgetId>();
    const valid: DashboardWidgetId[] = [];

    for (const id of order[column] ?? []) {
      if (DASHBOARD_WIDGET_IDS.includes(id) && !seen.has(id)) {
        valid.push(id);
        seen.add(id);
      }
    }

    for (const id of DEFAULT_DASHBOARD_ORDER[column]) {
      if (!seen.has(id)) {
        valid.push(id);
        seen.add(id);
      }
    }

    result[column] = valid;
  }

  return result;
}

function loadPrefs(): DashboardLayoutPrefs {
  if (typeof window === 'undefined') {
    return { order: DEFAULT_DASHBOARD_ORDER, collapsed: {} };
  }

  try {
    const raw = localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
    if (!raw) {
      return { order: DEFAULT_DASHBOARD_ORDER, collapsed: {} };
    }

    const parsed = JSON.parse(raw) as Partial<DashboardLayoutPrefs>;
    return {
      order: sanitizeOrder({
        ...DEFAULT_DASHBOARD_ORDER,
        ...parsed.order,
      }),
      collapsed: parsed.collapsed ?? {},
    };
  } catch {
    return { order: DEFAULT_DASHBOARD_ORDER, collapsed: {} };
  }
}

function savePrefs(prefs: DashboardLayoutPrefs) {
  localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(prefs));
}

export function useDashboardLayout() {
  const [prefs, setPrefs] = useState<DashboardLayoutPrefs>(loadPrefs);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      savePrefs(prefs);
    }
  }, [prefs, ready]);

  const toggleCollapsed = useCallback((id: DashboardWidgetId) => {
    setPrefs((prev) => ({
      ...prev,
      collapsed: {
        ...prev.collapsed,
        [id]: !prev.collapsed[id],
      },
    }));
  }, []);

  const moveWidget = useCallback(
    (id: DashboardWidgetId, direction: 'up' | 'down') => {
      setPrefs((prev) => {
        const column = (['main', 'side', 'full'] as const).find((col) =>
          prev.order[col].includes(id),
        );
        if (!column) return prev;

        const list = [...prev.order[column]];
        const index = list.indexOf(id);
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= list.length) return prev;

        [list[index], list[target]] = [list[target], list[index]];

        return {
          ...prev,
          order: {
            ...prev.order,
            [column]: list,
          },
        };
      });
    },
    [],
  );

  const resetLayout = useCallback(() => {
    setPrefs({ order: DEFAULT_DASHBOARD_ORDER, collapsed: {} });
  }, []);

  return {
    prefs,
    ready,
    toggleCollapsed,
    moveWidget,
    resetLayout,
  };
}
