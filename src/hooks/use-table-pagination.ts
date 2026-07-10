'use client';

import { useMemo, useState } from 'react';
import type { TablePaginationConfig } from 'antd';

import {
  APP_TABLE_PAGE_SIZE_DEFAULT,
  buildTablePaginationConfig,
} from '@/lib/ant-table-config';

type UseTablePaginationOptions = {
  total: number;
  defaultPageSize?: number;
};

export function useTablePagination({
  total,
  defaultPageSize = APP_TABLE_PAGE_SIZE_DEFAULT,
}: UseTablePaginationOptions) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const pagination = useMemo<TablePaginationConfig | false>(
    () =>
      buildTablePaginationConfig({
        current: page,
        pageSize,
        total,
        onChange: (nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        },
      }),
    [page, pageSize, total],
  );

  return { page, pageSize, setPage, setPageSize, pagination };
}
