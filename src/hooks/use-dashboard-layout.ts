'use client';

import { useCallback, useSyncExternalStore } from 'react';

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

const EMPTY_COLLAPSED: Partial<Record<DashboardWidgetId, boolean>> = {};

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
    return { order: DEFAULT_DASHBOARD_ORDER, collapsed: EMPTY_COLLAPSED };
  }

  try {
    const raw = localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
    if (!raw) {
      return { order: DEFAULT_DASHBOARD_ORDER, collapsed: EMPTY_COLLAPSED };
    }

    const parsed = JSON.parse(raw) as Partial<DashboardLayoutPrefs>;
    return {
      order: sanitizeOrder({
        ...DEFAULT_DASHBOARD_ORDER,
        ...parsed.order,
      }),
      collapsed: parsed.collapsed ?? EMPTY_COLLAPSED,
    };
  } catch {
    return { order: DEFAULT_DASHBOARD_ORDER, collapsed: EMPTY_COLLAPSED };
  }
}

// Настройки раскладки — внешний store (localStorage), читаем через useSyncExternalStore:
// без двойного рендера при монтировании и без setState внутри эффектов.
let snapshot: DashboardLayoutPrefs = {
  order: DEFAULT_DASHBOARD_ORDER,
  collapsed: EMPTY_COLLAPSED,
};
let snapshotRead = false;
const listeners = new Set<() => void>();

function getSnapshot(): DashboardLayoutPrefs {
  if (!snapshotRead) {
    snapshot = loadPrefs();
    snapshotRead = true;
  }
  return snapshot;
}

function getServerSnapshot(): DashboardLayoutPrefs {
  return { order: DEFAULT_DASHBOARD_ORDER, collapsed: EMPTY_COLLAPSED };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commitPrefs(next: DashboardLayoutPrefs) {
  snapshot = next;
  snapshotRead = true;
  try {
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage может быть недоступен (приватный режим) — раскладка просто не сохранится.
  }
  listeners.forEach((listener) => listener());
}

export function useDashboardLayout() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleCollapsed = useCallback((id: DashboardWidgetId) => {
    const current = getSnapshot();
    commitPrefs({
      ...current,
      collapsed: {
        ...current.collapsed,
        [id]: !current.collapsed[id],
      },
    });
  }, []);

  const moveWidget = useCallback(
    (id: DashboardWidgetId, direction: 'up' | 'down') => {
      const current = getSnapshot();
      const column = (['main', 'side', 'full'] as const).find((col) =>
        current.order[col].includes(id),
      );
      if (!column) return;

      const list = [...current.order[column]];
      const index = list.indexOf(id);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= list.length) return;

      [list[index], list[target]] = [list[target], list[index]];

      commitPrefs({
        ...current,
        order: {
          ...current.order,
          [column]: list,
        },
      });
    },
    [],
  );

  const resetLayout = useCallback(() => {
    commitPrefs({ order: DEFAULT_DASHBOARD_ORDER, collapsed: EMPTY_COLLAPSED });
  }, []);

  return {
    prefs,
    toggleCollapsed,
    moveWidget,
    resetLayout,
  };
}
