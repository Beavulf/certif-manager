import type { TableProps } from 'antd';

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
