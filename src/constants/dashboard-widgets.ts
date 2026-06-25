export const DASHBOARD_WIDGET_IDS = [
  'employee-search',
  'expiry-calendar',
  'attention',
  'problems',
  'system',
  'activity',
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export type DashboardWidgetColumn = 'main' | 'side' | 'full';

export type DashboardWidgetMeta = {
  id: DashboardWidgetId;
  label: string;
  column: DashboardWidgetColumn;
};

export const DASHBOARD_WIDGETS: DashboardWidgetMeta[] = [
  { id: 'employee-search', label: 'Поиск сотрудника', column: 'main' },
  { id: 'expiry-calendar', label: 'Календарь истечений', column: 'main' },
  { id: 'attention', label: 'Требуют внимания', column: 'main' },
  { id: 'problems', label: 'Проблемы', column: 'side' },
  { id: 'system', label: 'Система', column: 'side' },
  { id: 'activity', label: 'Последняя активность', column: 'full' },
];

export const DEFAULT_DASHBOARD_ORDER: Record<DashboardWidgetColumn, DashboardWidgetId[]> = {
  main: ['employee-search', 'expiry-calendar', 'attention'],
  side: ['problems', 'system'],
  full: ['activity'],
};

export const DASHBOARD_LAYOUT_STORAGE_KEY = 'cert-manager-dashboard-layout';
