'use client';

import { Button } from '@/components/ui/button';
import { Input as UiInput } from '@/components/ui/input';
import { useAuditLogs, useRefreshSystemStatus } from '@/hooks/use-settings';
import { AppDataTableProvider, AppDataTableShell } from '@/components/ui/app-data-table';
import { Table, Tag, Select } from 'antd';
import { useDebounce } from 'use-debounce';
import {
  CheckCircle2,
  Clock3,
  Database,
  HardDrive,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

import { APP_TABLE_LOCALE, buildTablePaginationConfig } from '@/lib/ant-table-config';import { cn } from '@/lib/utils';
import { AUDIT_ACTION_LABELS } from '@/types/settings-types';
import type { SystemStatus } from '@/types/settings-types';

import { SettingsSectionCard } from './settings-ui';

type SystemAuditPanelProps = {
  systemStatus: SystemStatus;
};

type StatusLine = {
  label: string;
  value: string;
  ok?: boolean;
};

function StatusCard({
  title,
  ok,
  message,
  icon: Icon,
  lines,
}: {
  title: string;
  ok: boolean;
  message?: string;
  icon: React.ComponentType<{ className?: string }>;
  lines?: StatusLine[];
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3',
        ok
          ? 'border-emerald-200/80 bg-emerald-50/50'
          : 'border-red-200/80 bg-red-50/50',
      )}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background/80',
          ok ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700',
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {ok ? (
            <CheckCircle2 className="size-3.5 text-emerald-600" />
          ) : (
            <XCircle className="size-3.5 text-red-600" />
          )}
        </div>
        {message ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{message}</p>
        ) : null}
        {lines?.length ? (
          <dl className="mt-1.5 space-y-1">
            {lines.map((line) => (
              <div key={line.label} className="flex flex-wrap gap-x-2 text-xs">
                <dt className="shrink-0 text-muted-foreground">{line.label}:</dt>
                <dd
                  className={cn(
                    'min-w-0 break-words',
                    line.ok === false
                      ? 'text-red-600'
                      : line.ok
                        ? 'text-emerald-700'
                        : 'text-foreground/80',
                  )}
                >
                  {line.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </div>
  );
}

const AUDIT_ACTION_TAG_COLORS: Record<string, string> = {
  uploadCert: 'green',
  uploadDoc: 'green',
  deleteCert: 'red',
  deleteDoc: 'red',
  viewCert: 'default',
  editEmployee: 'gold',
  editCertificate: 'gold',
  editSettings: 'gold',
  exportReport: 'cyan',
  login: 'purple',
  sendNotification: 'blue',
};

const ACTION_SELECT_OPTIONS = Object.entries(AUDIT_ACTION_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export function SystemAuditPanel({ systemStatus }: SystemAuditPanelProps) {
  // Локальный стейт статуса: кнопка «Обновить» подтягивает свежие пробы
  // в обход кэша. При изменении systemStatus из props (например, после
  // сохранения настроек) оверрайд сбрасывается — паттерн «adjust state
  // during render» без эффекта.
  const [statusOverride, setStatusOverride] = useState<SystemStatus | null>(
    null,
  );
  const [prevSystemStatus, setPrevSystemStatus] = useState(systemStatus);

  if (prevSystemStatus !== systemStatus) {
    setPrevSystemStatus(systemStatus);
    setStatusOverride(null);
  }

  const status = statusOverride ?? systemStatus;
  const refreshStatus = useRefreshSystemStatus();

  const handleRefreshStatus = async () => {
    const fresh = await refreshStatus.mutateAsync();
    setStatusOverride(fresh);
  };

  // Фильтры журнала аудита
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [actionFilter, setActionFilterState] = useState<string | undefined>();
  const [searchInput, setSearchInputState] = useState('');
  const [debouncedSearch] = useDebounce(searchInput, 300);

  // Смена фильтра возвращается на первую страницу сразу в обработчике —
  // без setState внутри эффекта.
  const setActionFilter = (value?: string) => {
    setActionFilterState(value);
    setPage(1);
  };

  const setSearchInput = (value: string) => {
    setSearchInputState(value);
    setPage(1);
  };

  const filters = {
    action: actionFilter,
    search: debouncedSearch.trim() || undefined,
  };

  const { data, isPending, refetch, isRefetching } = useAuditLogs(
    page,
    pageSize,
    filters,
  );

  return (
    <div className="space-y-5">
      <SettingsSectionCard
        title="Состояние системы"
        description="Только для просмотра. Параметры подключения задаются через переменные окружения."
      >
        <div className="mb-3 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={refreshStatus.isPending}
            onClick={() => {
              void handleRefreshStatus().catch(() => undefined);
            }}
          >
            <RefreshCw
              className={cn('size-4', refreshStatus.isPending && 'animate-spin')}
            />
            Обновить статус
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <StatusCard
            title="База данных"
            ok={status.database.ok}
            message={status.database.message}
            icon={Database}
          />
          <StatusCard
            title="MinIO (файлы)"
            ok={status.minio.ok}
            message={status.minio.message}
            icon={HardDrive}
          />
          <StatusCard
            title="Cron-проверка"
            ok={status.cron.lastCheck.ok}
            icon={Clock3}
            lines={[
              {
                label: 'Следующий запуск',
                value: status.cron.nextDescription,
              },
              {
                label: 'Обновление статусов',
                value: `ежедневно в 00:00 (${status.cron.timezone})`,
              },
              {
                label: 'Последняя проверка',
                value: status.cron.lastCheck.message,
                ok: status.cron.lastCheck.ok,
              },
            ]}
          />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Журнал аудита"
        description="История действий пользователей в системе."
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={actionFilter}
            onChange={setActionFilter}
            options={ACTION_SELECT_OPTIONS}
            placeholder="Все действия"
            allowClear
            className="w-full sm:w-56"
          />
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <UiInput
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Поиск по пользователю или описанию…"
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={isRefetching}
            onClick={() => {
              void refetch().catch(() => undefined);
            }}
          >
            <RefreshCw className={cn('size-4', isRefetching && 'animate-spin')} />
            Обновить
          </Button>
        </div>

        <AppDataTableProvider>
          <AppDataTableShell>
            <Table
              size="small"
              loading={isPending}
              rowKey="id"
              dataSource={data?.items ?? []}
              scroll={{ x: 800 }}
              locale={APP_TABLE_LOCALE}
              pagination={buildTablePaginationConfig({
                current: page,
                pageSize,
                total: data?.total ?? 0,
                onChange: (nextPage, nextPageSize) => {
                  setPage(nextPage);
                  setPageSize(nextPageSize);
                },
              })}
              columns={[
                {
                  title: 'Время',
                  dataIndex: 'createdAt',
                  width: 150,
                  render: (value: string) => (
                    <span className="text-muted-foreground">
                      {new Date(value).toLocaleString('ru-RU')}
                    </span>
                  ),
                },
                {
                  title: 'Пользователь',
                  dataIndex: 'adUsername',
                  width: 130,
                  ellipsis: true,
                  render: (value: string | null) => value ?? '—',
                },
                {
                  title: 'Действие',
                  dataIndex: 'action',
                  width: 160,
                  render: (value: string, record: { displayName?: string | null }) => {
                    const isError = record.displayName?.startsWith('Ошибка');
                    return (
                      <Tag
                        color={isError ? 'red' : AUDIT_ACTION_TAG_COLORS[value] ?? 'gold'}
                        className="!m-0"
                      >
                        {AUDIT_ACTION_LABELS[value] ?? value}
                      </Tag>
                    );
                  },
                },
                {
                  title: 'Описание',
                  dataIndex: 'displayName',
                  ellipsis: true,
                  render: (value: string | null) => value ?? '—',
                },
              ]}
            />
          </AppDataTableShell>
        </AppDataTableProvider>
      </SettingsSectionCard>
    </div>
  );
}
