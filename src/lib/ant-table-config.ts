import type { TablePaginationConfig, TableProps } from 'antd';

export const APP_TABLE_PAGE_SIZES = [5, 10, 25, 50] as const;
export const APP_TABLE_PAGE_SIZE_DEFAULT = 10;

export const APP_TABLE_THEME = {
  token: {
    colorPrimary: '#b45309',
    borderRadius: 8,
    fontFamily: 'inherit',
    colorBorder: 'hsl(32 18% 88%)',
    colorText: 'hsl(222 28% 14%)',
    colorTextSecondary: 'hsl(28 10% 42%)',
  },
  components: {
    Table: {
      headerBg: 'hsl(40 22% 95%)',
      headerColor: 'hsl(28 10% 42%)',
      rowHoverBg: 'hsl(43 100% 95%)',
      borderColor: 'hsl(32 18% 88%)',
      cellPaddingBlock: 10,
      cellPaddingInline: 14,
    },
    Pagination: {
      itemActiveBg: 'hsl(43 100% 95%)',
    },
    Popconfirm: {
      borderRadiusLG: 10,
    },
  },
} as const;

export const APP_TABLE_LOCALE: NonNullable<TableProps['locale']> = {
  emptyText: 'Нет данных',
  triggerDesc: 'Сортировать по убыванию',
  triggerAsc: 'Сортировать по возрастанию',
  cancelSort: 'Сбросить сортировку',
};

export const TABLE_METRICS = {
  PAGE_SIZE_MIN: 5,
  PAGE_SIZE_MAX: 50,
  TABLE_HEAD_HEIGHT: 44,
  PAGINATION_HEIGHT: 52,
  ROW_HEIGHT: 44,
  VIEWPORT_BOTTOM_GAP: 48,
  TABLE_WRAPPER_PADDING: 0,
  ROW_SAFETY_MARGIN: 1,
} as const;

export function formatTableTotal(total: number): string {
  return `Всего: ${total}`;
}

export function buildPageSizeOptions(total: number): number[] {
  const safeTotal = Math.max(total, 1);
  const options = new Set<number>(APP_TABLE_PAGE_SIZES);
  options.add(safeTotal);
  return [...options].sort((a, b) => a - b);
}

export function formatPageSizeOption(size: number, total: number): string {
  const safeTotal = Math.max(total, 1);
  const isStandardSize = (APP_TABLE_PAGE_SIZES as readonly number[]).includes(size);
  if (size === safeTotal && !isStandardSize) {
    return 'Все';
  }
  return String(size);
}

export function buildTablePaginationConfig({
  current,
  pageSize,
  total,
  onChange,
}: {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
}): TablePaginationConfig | false {
  if (total === 0) return false;

  return {
    current,
    pageSize,
    total,
    showSizeChanger: true,
    pageSizeOptions: buildPageSizeOptions(total),
    buildOptionText: (size: number) => formatPageSizeOption(size, total),
    showTotal: formatTableTotal,
    hideOnSinglePage: false,
    onChange,
  } as TablePaginationConfig;
}
