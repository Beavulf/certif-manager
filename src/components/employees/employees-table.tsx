'use client';

import { Popconfirm, Table, Tooltip } from 'antd';
import type { TableProps } from 'antd';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useMemo } from 'react';

import { AppDataTableProvider, AppDataTableShell } from '@/components/ui/app-data-table';
import { DataTableAction } from '@/components/ui/data-table-action';
import { StatusBadge } from '@/components/ui/status-badge';
import { useViewportTableMetrics } from '@/hooks/use-viewport-table-metrics';
import { useTablePagination } from '@/hooks/use-table-pagination';
import {
  countActiveCertificates,
  type EmployeeListItem,
} from '@/lib/employee-table-utils';
import { APP_TABLE_LOCALE } from '@/lib/ant-table-config';
import { cn } from '@/lib/utils';

type EmployeesTableProps = {
  data: EmployeeListItem[];
  loading?: boolean;
  deleting?: boolean;
  selectedRowKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  onView: (id: string) => void;
  onEdit: (employee: EmployeeListItem) => void;
  onDelete: (id: string) => void;
  className?: string;
};

export function EmployeesTable({
  data,
  loading = false,
  deleting = false,
  selectedRowKeys = [],
  onSelectionChange,
  onView,
  onEdit,
  onDelete,
  className,
}: EmployeesTableProps) {
  const { containerRef, scrollY } = useViewportTableMetrics(data.length);
  const { pagination } = useTablePagination({ total: data.length });

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
        render: (value: string) => (
          <span className="text-muted-foreground">{value}</span>
        ),
      },
      {
        title: 'Логин AD',
        dataIndex: 'adUsername',
        key: 'adUsername',
        width: 130,
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
        width: 120,
        align: 'center',
        sorter: (a, b) => a.certificates.length - b.certificates.length,
        render: (_value, record) => {
          const active = countActiveCertificates(record.certificates);
          return (
            <Tooltip title={`Активных: ${active}`}>
              <StatusBadge tone={record.certificates.length > 0 ? 'accent' : 'neutral'}>
                {record.certificates.length}
              </StatusBadge>
            </Tooltip>
          );
        },
      },
      {
        title: 'Статус',
        dataIndex: 'isActive',
        key: 'isActive',
        width: 110,
        filters: [
          { text: 'Активен', value: true },
          { text: 'Неактивен', value: false },
        ],
        onFilter: (value, record) => record.isActive === value,
        render: (isActive: boolean) => (
          <StatusBadge tone={isActive ? 'success' : 'neutral'}>
            {isActive ? 'Активен' : 'Неактивен'}
          </StatusBadge>
        ),
      },
      {
        title: '',
        key: 'actions',
        width: 112,
        fixed: 'right',
        align: 'center',
        render: (_value, record) => (
          <div className="flex items-center justify-center gap-0.5">
            <DataTableAction
              icon={Eye}
              label="Просмотр"
              onClick={() => onView(record.id)}
            />
            <DataTableAction
              icon={Pencil}
              label="Редактировать"
              onClick={() => onEdit(record)}
            />
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
                <DataTableAction
                  icon={Trash2}
                  label="Удалить"
                  variant="danger"
                  disabled={deleting}
                />
              </span>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [deleting, onDelete, onEdit, onView],
  );

  return (
    <AppDataTableProvider>
      <AppDataTableShell containerRef={containerRef} className={cn('h-full', className)}>
        <Table<EmployeeListItem>
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns}
          rowSelection={
            onSelectionChange
              ? {
                  selectedRowKeys,
                  onChange: (keys) => onSelectionChange(keys as string[]),
                }
              : undefined
          }
          scroll={{ x: 960, y: scrollY }}
          showSorterTooltip={{ target: 'sorter-icon' }}
          locale={APP_TABLE_LOCALE}
          pagination={pagination}
        />
      </AppDataTableShell>
    </AppDataTableProvider>
  );
}
