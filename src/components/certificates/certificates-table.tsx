'use client';

import { Popconfirm, Table } from 'antd';
import type { TableProps } from 'antd';
import { Eye, Trash2 } from 'lucide-react';
import { useMemo } from 'react';

import { AppDataTableProvider, AppDataTableShell } from '@/components/ui/app-data-table';
import { DataTableAction } from '@/components/ui/data-table-action';
import { CertificateNotesCell } from '@/components/certificates/certificate-notes-cell';
import { useViewportTableMetrics } from '@/hooks/use-viewport-table-metrics';
import {
  daysUntilExpiry,
  getDaysLeftClass,
  getDaysLeftLabel,
  getExpiryUrgency,
  getUrgencyBadgeClass,
  getUrgencyRowClass,
  STATUS_LABELS,
  type ExpiryThresholds,
} from '@/lib/certificate-expiry';
import {
  buildCertificateTableRows,
  type CertificateGroupBy,
  type CertificateTableRow,
} from '@/lib/certificate-table-utils';
import { APP_TABLE_LOCALE, formatTableTotal } from '@/lib/ant-table-config';
import type { CertificatesWithIncludes } from '@/types/certificate-types';
import { cn } from '@/lib/utils';

type CertificatesTableProps = {
  data: CertificatesWithIncludes[];
  groupBy: CertificateGroupBy;
  selectedRowKeys: string[];
  onSelectionChange: (keys: string[]) => void;
  loading?: boolean;
  deleting?: boolean;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  expiryThresholds?: ExpiryThresholds;
  className?: string;
};

const formatDate = (value: Date | string) =>
  new Date(value).toLocaleDateString('ru-RU');

const compareStrings = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? '').localeCompare(b ?? '', 'ru', { sensitivity: 'base' });

const compareDates = (
  a: Date | string | null | undefined,
  b: Date | string | null | undefined,
) => new Date(a ?? 0).getTime() - new Date(b ?? 0).getTime();

export function CertificatesTable({
  data,
  groupBy,
  selectedRowKeys,
  onSelectionChange,
  loading = false,
  deleting = false,
  onView,
  onDelete,
  expiryThresholds,
  className,
}: CertificatesTableProps) {
  const tableRows = useMemo(
    () => buildCertificateTableRows(data, groupBy),
    [data, groupBy],
  );

  const { containerRef, pageSize, scrollY } = useViewportTableMetrics(tableRows.length);
  const showPagination = tableRows.length > pageSize;
  const sortingEnabled = groupBy === 'none';

  const columns: TableProps<CertificateTableRow>['columns'] = [
    {
      title: 'Название',
      dataIndex: 'subjectCN',
      key: 'subjectCN',
      ellipsis: true,
      sorter: sortingEnabled
        ? (a, b) => compareStrings(a.subjectCN, b.subjectCN)
        : undefined,
      sortDirections: ['ascend', 'descend'],
      render: (value: string, record) => (
        <div className="min-w-0">
          {record.groupLabel && (
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {record.groupLabel}
              </span>
              {record.groupCount != null && (
                <span className="rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                  {record.groupCount}
                </span>
              )}
            </div>
          )}
          <span className="font-medium text-foreground">{value}</span>
        </div>
      ),
    },
    {
      title: 'Serial',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      ellipsis: true,
      width: 180,
      sorter: sortingEnabled
        ? (a, b) => compareStrings(a.serialNumber, b.serialNumber)
        : undefined,
      sortDirections: ['ascend', 'descend'],
      render: (value: string) => (
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
      ),
    },
    {
      title: 'Действует с',
      dataIndex: 'validFrom',
      key: 'validFrom',
      width: 110,
      sorter: sortingEnabled
        ? (a, b) => compareDates(a.validFrom, b.validFrom)
        : undefined,
      sortDirections: ['ascend', 'descend'],
      render: (value: Date | string) => (
        <span className="text-muted-foreground">{formatDate(value)}</span>
      ),
    },
    {
      title: 'Истекает',
      dataIndex: 'validTo',
      key: 'validTo',
      width: 110,
      sorter: sortingEnabled
        ? (a, b) => compareDates(a.validTo, b.validTo)
        : undefined,
      sortDirections: ['ascend', 'descend'],
      defaultSortOrder: sortingEnabled ? 'ascend' : undefined,
      render: (value: Date | string) => (
        <span className="text-muted-foreground">{formatDate(value)}</span>
      ),
    },
    {
      title: 'Осталось',
      key: 'daysLeft',
      width: 100,
      sorter: sortingEnabled
        ? (a, b) => daysUntilExpiry(a.validTo) - daysUntilExpiry(b.validTo)
        : undefined,
      sortDirections: ['ascend', 'descend'],
      render: (_, record) => {
        const urgency = getExpiryUrgency(record, expiryThresholds);
        const days = daysUntilExpiry(record.validTo);
        return (
          <span
            className={cn(
              'text-sm font-medium tabular-nums',
              getDaysLeftClass(urgency),
            )}
          >
            {getDaysLeftLabel(days)}
          </span>
        );
      },
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      sorter: sortingEnabled
        ? (a, b) => compareStrings(String(a.status), String(b.status))
        : undefined,
      sortDirections: ['ascend', 'descend'],
      render: (_, record) => {
        const urgency = getExpiryUrgency(record, expiryThresholds);
        return (
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
              getUrgencyBadgeClass(urgency),
            )}
          >
            {STATUS_LABELS[record.status]}
          </span>
        );
      },
    },
    {
      title: 'Примечание',
      dataIndex: 'notes',
      key: 'notes',
      width: 160,
      render: (value, record) => (
        <CertificateNotesCell certificateId={record.id} value={value ?? null} />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 88,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <div className="flex items-center justify-center gap-0.5">
          <DataTableAction
            icon={Eye}
            label="Просмотр"
            onDoubleClick={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onView(record.id);
            }}
          />
          <Popconfirm
            title="Удалить сертификат?"
            description={`«${record.subjectCN}» будет удалён без возможности восстановления.`}
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true, loading: deleting }}
            onConfirm={() => onDelete(record.id)}
            placement="topRight"
          >
            <span className="inline-flex">
              <DataTableAction
                icon={Trash2}
                label="Удалить"
                variant="danger"
                disabled={deleting}
                onDoubleClick={(e) => e.stopPropagation()}
              />
            </span>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <AppDataTableProvider>
      <AppDataTableShell containerRef={containerRef} className={cn('h-full', className)}>
        <Table<CertificateTableRow>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={tableRows}
          loading={loading}
          showSorterTooltip={{ target: 'sorter-icon' }}
          locale={APP_TABLE_LOCALE}
          scroll={{ x: 1040, y: scrollY }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => onSelectionChange(keys as string[]),
            preserveSelectedRowKeys: true,
            columnWidth: 44,
          }}
          pagination={
            showPagination
              ? {
                  pageSize,
                  showSizeChanger: false,
                  showTotal: formatTableTotal,
                }
              : false
          }
          onRow={(record) => {
            const urgency = getExpiryUrgency(record, expiryThresholds);
            return {
              onDoubleClick: () => onView(record.id),
              className: cn(
                'cursor-pointer',
                getUrgencyRowClass(urgency),
                record.isFirstInGroup && groupBy !== 'none' && 'cert-row-group-start',
              ),
            };
          }}
        />
      </AppDataTableShell>
    </AppDataTableProvider>
  );
}
