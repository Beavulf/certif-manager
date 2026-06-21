'use client';

import { ConfigProvider, Popconfirm, Table, Tooltip } from 'antd';
import type { TableProps } from 'antd';
import { Eye, Trash2 } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { CertificateNotesCell } from '@/components/certificates/certificate-notes-cell';
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

const PAGE_SIZE_MIN = 5;
const PAGE_SIZE_MAX = 50;
const TABLE_HEAD_HEIGHT = 48;
const PAGINATION_HEIGHT = 52;
const ROW_HEIGHT = 48;
const VIEWPORT_BOTTOM_GAP = 28;

const formatDate = (value: Date | string) =>
  new Date(value).toLocaleDateString('ru-RU');

const compareStrings = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? '').localeCompare(b ?? '', 'ru', { sensitivity: 'base' });

const compareDates = (
  a: Date | string | null | undefined,
  b: Date | string | null | undefined,
) => new Date(a ?? 0).getTime() - new Date(b ?? 0).getTime();

function useViewportPageSize() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(10);

  useLayoutEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) return;

      const top = el.getBoundingClientRect().top;
      const available = window.innerHeight - top - VIEWPORT_BOTTOM_GAP;
      const rows = Math.floor(
        (available - TABLE_HEAD_HEIGHT - PAGINATION_HEIGHT) / ROW_HEIGHT,
      );

      setPageSize(
        Math.max(PAGE_SIZE_MIN, Math.min(rows || PAGE_SIZE_MIN, PAGE_SIZE_MAX)),
      );
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(document.documentElement);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return { containerRef, pageSize };
}

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

  const { containerRef, pageSize } = useViewportPageSize();
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
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
      width: 200,
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
      width: 120,
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
      width: 120,
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
      width: 110,
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
      width: 120,
      sorter: sortingEnabled
        ? (a, b) => compareStrings(String(a.status), String(b.status))
        : undefined,
      sortDirections: ['ascend', 'descend'],
      render: (_, record) => {
        const urgency = getExpiryUrgency(record, expiryThresholds);
        return (
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
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
      width: 180,
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
        <div className="flex items-center justify-center gap-1">
          <Tooltip title="Просмотр">
            <button
              type="button"
              aria-label="Просмотр"
              className="certificates-table-action inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onDoubleClick={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onView(record.id);
              }}
            >
              <Eye className="size-4" />
            </button>
          </Tooltip>

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
              <Tooltip title="Удалить">
                <button
                  type="button"
                  disabled={deleting}
                  aria-label="Удалить"
                  onDoubleClick={(e) => e.stopPropagation()}
                  className="certificates-table-action inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                </button>
              </Tooltip>
            </span>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#f59e0b',
          borderRadius: 12,
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
            cellPaddingBlock: 12,
            cellPaddingInline: 16,
          },
          Pagination: {
            itemActiveBg: 'hsl(43 100% 95%)',
          },
          Popconfirm: {
            borderRadiusLG: 12,
          },
        },
      }}
    >
      <div
        ref={containerRef}
        className={cn('certificates-table w-full overflow-hidden', className)}
      >
        <Table<CertificateTableRow>
          rowKey="id"
          columns={columns}
          dataSource={tableRows}
          loading={loading}
          size="middle"
          showSorterTooltip={{ target: 'sorter-icon' }}
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
                  showTotal: () => `Записей: ${data.length}`,
                }
              : false
          }
          locale={{
            emptyText: 'Нет данных',
            triggerDesc: 'Сортировать по убыванию',
            triggerAsc: 'Сортировать по возрастанию',
            cancelSort: 'Сбросить сортировку',
          }}
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
      </div>
    </ConfigProvider>
  );
}
