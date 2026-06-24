'use client';

import { ConfigProvider, Popconfirm, Table, Tag, Tooltip } from 'antd';
import type { TableProps } from 'antd';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  countActiveCertificates,
  type EmployeeListItem,
} from '@/lib/employee-table-utils';
import { cn } from '@/lib/utils';

type EmployeesTableProps = {
  data: EmployeeListItem[];
  loading?: boolean;
  deleting?: boolean;
  onView: (id: string) => void;
  onEdit: (employee: EmployeeListItem) => void;
  onDelete: (id: string) => void;
  className?: string;
};

const PAGE_SIZE_MIN = 5;
const PAGE_SIZE_MAX = 50;
const TABLE_HEAD_HEIGHT = 48;
const PAGINATION_HEIGHT = 56;
const ROW_HEIGHT = 48;
const TABLE_WRAPPER_PADDING = 16;
/** Запас снизу: отступ PageShell, рамка карточки, зазор до края окна */
const VIEWPORT_BOTTOM_GAP = 56;
const ROW_SAFETY_MARGIN = 1;

function useViewportTableMetrics(dataLength: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(10);
  const [scrollY, setScrollY] = useState(ROW_HEIGHT * PAGE_SIZE_MIN);

  useLayoutEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) return;

      const top = el.getBoundingClientRect().top;
      const available = window.innerHeight - top - VIEWPORT_BOTTOM_GAP;
      const paginationReserve =
        dataLength > PAGE_SIZE_MIN ? PAGINATION_HEIGHT : 0;
      const bodySpace =
        available -
        TABLE_HEAD_HEIGHT -
        TABLE_WRAPPER_PADDING -
        paginationReserve;

      const rows = Math.floor(bodySpace / ROW_HEIGHT) - ROW_SAFETY_MARGIN;
      const nextPageSize = Math.max(
        PAGE_SIZE_MIN,
        Math.min(rows || PAGE_SIZE_MIN, PAGE_SIZE_MAX),
      );

      const visibleRows = Math.min(dataLength || nextPageSize, nextPageSize);
      const bodyHeight = Math.max(
        ROW_HEIGHT * PAGE_SIZE_MIN,
        visibleRows * ROW_HEIGHT,
      );

      setPageSize(nextPageSize);
      setScrollY(Math.min(bodySpace, bodyHeight));
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(document.documentElement);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [dataLength]);

  return { containerRef, pageSize, scrollY };
}

export function EmployeesTable({
  data,
  loading = false,
  deleting = false,
  onView,
  onEdit,
  onDelete,
  className,
}: EmployeesTableProps) {
  const { containerRef, pageSize, scrollY } = useViewportTableMetrics(data.length);
  const showPagination = data.length > pageSize;

  const columns = useMemo<TableProps<EmployeeListItem>['columns']>(
    () => [
      {
        title: 'ФИО',
        dataIndex: 'fullName',
        key: 'fullName',
        ellipsis: true,
        sorter: (a, b) => a.fullName.localeCompare(b.fullName, 'ru'),
        render: (value: string, record) => (
          <button
            type="button"
            onClick={() => onView(record.id)}
            className="cursor-pointer truncate text-left font-medium text-foreground hover:text-amber-800"
          >
            {value}
          </button>
        ),
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
        ellipsis: true,
        width: 200,
      },
      {
        title: 'Логин AD',
        dataIndex: 'adUsername',
        key: 'adUsername',
        width: 140,
        ellipsis: true,
        render: (value: string | null) => value ?? '—',
      },
      {
        title: 'Отдел',
        key: 'department',
        width: 180,
        ellipsis: true,
        render: (_value, record) => {
          const parts = [record.department, record.position].filter(Boolean);
          return parts.length > 0 ? parts.join(' · ') : '—';
        },
      },
      {
        title: 'Сертификаты',
        key: 'certificates',
        width: 130,
        align: 'center',
        sorter: (a, b) => a.certificates.length - b.certificates.length,
        render: (_value, record) => {
          const active = countActiveCertificates(record.certificates);
          return (
            <Tooltip title={`Активных: ${active}`}>
              <Tag color={record.certificates.length > 0 ? 'gold' : 'default'}>
                {record.certificates.length}
              </Tag>
            </Tooltip>
          );
        },
      },
      {
        title: 'Статус',
        dataIndex: 'isActive',
        key: 'isActive',
        width: 120,
        filters: [
          { text: 'Активен', value: true },
          { text: 'Неактивен', value: false },
        ],
        onFilter: (value, record) => record.isActive === value,
        render: (isActive: boolean) => (
          <Tag color={isActive ? 'green' : 'default'}>
            {isActive ? 'Активен' : 'Неактивен'}
          </Tag>
        ),
      },
      {
        title: '',
        key: 'actions',
        width: 120,
        fixed: 'right',
        render: (_value, record) => (
          <div className="flex items-center justify-center gap-1">
            <Tooltip title="Просмотр">
              <button
                type="button"
                aria-label="Просмотр"
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => onView(record.id)}
              >
                <Eye className="size-4" />
              </button>
            </Tooltip>
            <Tooltip title="Редактировать">
              <button
                type="button"
                aria-label="Редактировать"
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => onEdit(record)}
              >
                <Pencil className="size-4" />
              </button>
            </Tooltip>
            <Popconfirm
              title="Удалить сотрудника?"
              description={
                record.certificates.length > 0
                  ? `Сертификаты (${record.certificates.length}) останутся в системе без привязки.`
                  : 'Запись будет удалена безвозвратно.'
              }
              okText="Удалить"
              cancelText="Отмена"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(record.id)}
              disabled={deleting}
            >
              <span className="inline-flex">
                <Tooltip title="Удалить">
                  <button
                    type="button"
                    aria-label="Удалить"
                    disabled={deleting}
                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </Tooltip>
              </span>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [deleting, onDelete, onEdit, onView],
  );

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#b45309',
          borderRadius: 8,
        },
      }}
    >
      <div ref={containerRef} className={cn('min-h-0 overflow-hidden', className)}>
        <Table<EmployeeListItem>
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns}
          scroll={{ x: 960, y: scrollY }}
          pagination={
            showPagination
              ? {
                  pageSize,
                  showSizeChanger: false,
                  showTotal: (total) => `Всего: ${total}`,
                }
              : false
          }
        />
      </div>
    </ConfigProvider>
  );
}
