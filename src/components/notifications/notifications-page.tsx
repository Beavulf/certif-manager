'use client';

import { Select, Table } from 'antd';
import type { TableProps } from 'antd';
import { Eye, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { CertificateDetailDialog } from '@/components/certificates/certificate-detail-dialog';
import { NotificationsStats } from '@/components/notifications/notifications-stats';
import { AppDataTableProvider, AppDataTableShell } from '@/components/ui/app-data-table';
import { DataTableAction } from '@/components/ui/data-table-action';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useNotificationLogsPage,
  useRunNotificationCheck,
} from '@/hooks/use-notifications';
import { APP_TABLE_LOCALE, buildTablePaginationConfig } from '@/lib/ant-table-config';
import dayjs from '@/lib/dayjs-config';
import type { NotificationLogsQuery } from '@/schemas/notifications-schema';
import type { NotificationLogsPage } from '@/server/actions/notifications/get-notification-logs-page-action';
import type { NotificationLogWithIncludes } from '@/types/notification-log-types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Все статусы' },
  { value: 'sent', label: 'Отправлено' },
  { value: 'failed', label: 'Ошибка' },
] as const;

const PERIOD_OPTIONS = [
  { value: 'all', label: 'За всё время' },
  { value: 'today', label: 'Сегодня' },
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
] as const;

type NotificationsPageProps = {
  initial: NotificationLogsPage;
};

export function NotificationsPage({ initial }: NotificationsPageProps) {
  const [filters, setFilters] = useState<NotificationLogsQuery>({
    page: 1,
    pageSize: 10,
    search: '',
    status: 'all',
    period: 'all',
  });
  const [detailCertificateId, setDetailCertificateId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isPending, isFetching } = useNotificationLogsPage(filters);
  const runCheck = useRunNotificationCheck();

  const pageData = data ?? initial;
  const stats = pageData.stats;

  const columns = useMemo<TableProps<NotificationLogWithIncludes>['columns']>(
    () => [
      {
        title: 'Дата отправки',
        dataIndex: 'sentAt',
        width: 160,
        render: (value: Date) => dayjs(value).format('DD.MM.YYYY HH:mm'),
      },
      {
        title: 'Статус',
        dataIndex: 'status',
        width: 110,
        render: (status: string) => (
          <StatusBadge tone={status === 'sent' ? 'success' : 'danger'}>
            {status === 'sent' ? 'Отправлено' : 'Ошибка'}
          </StatusBadge>
        ),
      },
      {
        title: 'Получатель',
        dataIndex: 'sentTo',
        width: 200,
        ellipsis: true,
      },
      {
        title: 'Сертификат',
        key: 'certificate',
        ellipsis: true,
        render: (_: unknown, record) => {
          const cert = record.certificate;
          if (!cert) return '—';

          return (
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{cert.subjectCN}</p>
              <p className="truncate text-xs text-muted-foreground">
                {cert.serialNumber}
              </p>
            </div>
          );
        },
      },
      {
        title: 'Сотрудник',
        key: 'employee',
        width: 180,
        ellipsis: true,
        render: (_: unknown, record) =>
          record.certificate?.employee?.fullName ?? '—',
      },
      {
        title: 'Дней до истечения',
        dataIndex: 'daysBeforeExpiry',
        width: 130,
        align: 'center',
        render: (days: number) => `${days} дн.`,
      },
      {
        title: 'Истекает',
        key: 'validTo',
        width: 120,
        render: (_: unknown, record) =>
          record.certificate
            ? dayjs(record.certificate.validTo).format('DD.MM.YYYY')
            : '—',
      },
      {
        title: 'Ошибка',
        dataIndex: 'errorMessage',
        ellipsis: true,
        render: (value: string | null) => value ?? '—',
      },
      {
        title: '',
        key: 'actions',
        width: 56,
        fixed: 'right',
        align: 'center',
        render: (_: unknown, record) =>
          record.certificateId ? (
            <DataTableAction
              icon={Eye}
              label="Открыть сертификат"
              onClick={() => {
                setDetailCertificateId(record.certificateId);
                setDetailOpen(true);
              }}
            />
          ) : null,
      },
    ],
    [],
  );

  const updateFilters = (patch: Partial<NotificationLogsQuery>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  };

  return (
    <div className="space-y-5">
      <CertificateDetailDialog
        certificateId={detailCertificateId}
        open={detailOpen}
        onOpenChange={(next) => {
          setDetailOpen(next);
          if (!next) setDetailCertificateId(null);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <NotificationsStats stats={stats} loading={isPending || isFetching} />
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search ?? ''}
              onChange={(e) => updateFilters({ search: e.target.value })}
              placeholder="Поиск: email, ФИО, серийник, сертификат…"
              className="h-11 pl-9"
            />
          </div>

          <AppDataTableProvider>
            <div className="flex flex-wrap gap-3">
              <Select
                value={filters.status}
                onChange={(value) =>
                  updateFilters({ status: value as NotificationLogsQuery['status'] })
                }
                options={[...STATUS_OPTIONS]}
                className="min-w-[150px]"
              />
              <Select
                value={filters.period}
                onChange={(value) =>
                  updateFilters({ period: value as NotificationLogsQuery['period'] })
                }
                options={[...PERIOD_OPTIONS]}
                className="min-w-[150px]"
              />
            </div>
          </AppDataTableProvider>

          <Button
            onClick={() => runCheck.mutateAsync({})}
            disabled={runCheck.isPending}
          >
            {runCheck.isPending ? 'Проверка…' : 'Запустить проверку сейчас'}
          </Button>

          <Button variant="outline" asChild>
            <Link href="/settings">Настройки SMTP</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/70 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-foreground">
              Журнал уведомлений
            </h2>
            <span className="text-sm text-muted-foreground">
              Найдено: {pageData.total}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <AppDataTableProvider>
            <AppDataTableShell>
              <Table
                rowKey="id"
                size="small"
                loading={isPending || isFetching}
                columns={columns}
                dataSource={pageData.items}
                scroll={{ x: 1100 }}
                locale={{
                  ...APP_TABLE_LOCALE,
                  emptyText:
                    'Уведомлений пока нет. Запустите проверку или дождитесь cron.',
                }}
                pagination={buildTablePaginationConfig({
                  current: filters.page,
                  pageSize: filters.pageSize,
                  total: pageData.total,
                  onChange: (page, pageSize) =>
                    setFilters((prev) => ({ ...prev, page, pageSize })),
                })}
              />
            </AppDataTableShell>
          </AppDataTableProvider>
        </CardContent>
      </Card>
    </div>
  );
}
