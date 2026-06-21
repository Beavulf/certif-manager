'use client';

import { ConfigProvider, Table, Tag } from 'antd';
import {
  CheckCircle2,
  Clock3,
  Database,
  HardDrive,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

import { useAuditLogs } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import { AUDIT_ACTION_LABELS } from '@/types/settings-types';
import type { SystemStatus } from '@/types/settings-types';

import { SettingsSectionCard } from './settings-ui';

type SystemAuditPanelProps = {
  systemStatus: SystemStatus;
};

function StatusCard({
  title,
  ok,
  message,
  icon: Icon,
}: {
  title: string;
  ok: boolean;
  message: string;
  icon: React.ComponentType<{ className?: string }>;
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
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {ok ? (
            <CheckCircle2 className="size-3.5 text-emerald-600" />
          ) : (
            <XCircle className="size-3.5 text-red-600" />
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function SystemAuditPanel({ systemStatus }: SystemAuditPanelProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { data, isPending } = useAuditLogs(page, pageSize);

  return (
    <div className="space-y-5">
      <SettingsSectionCard
        title="Состояние системы"
        description="Только для просмотра. Параметры подключения задаются через переменные окружения."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <StatusCard
            title="База данных"
            ok={systemStatus.database.ok}
            message={systemStatus.database.message}
            icon={Database}
          />
          <StatusCard
            title="MinIO (файлы)"
            ok={systemStatus.minio.ok}
            message={systemStatus.minio.message}
            icon={HardDrive}
          />
          <StatusCard
            title="Cron-проверка"
            ok
            message={`${systemStatus.cron.nextDescription}. Обновление статусов — ежедневно в 00:00.`}
            icon={Clock3}
          />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Журнал аудита"
        description="История действий пользователей в системе."
      >
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#b45309',
              borderRadius: 8,
            },
          }}
        >
          <Table
            size="small"
            loading={isPending}
            rowKey="id"
            dataSource={data?.items ?? []}
            pagination={{
              current: page,
              pageSize,
              total: data?.total ?? 0,
              showSizeChanger: true,
              pageSizeOptions: [10, 25, 50, 100],
              onChange: (nextPage, nextSize) => {
                setPage(nextPage);
                setPageSize(nextSize);
              },
            }}
            columns={[
              {
                title: 'Время',
                dataIndex: 'createdAt',
                width: 160,
                render: (value: string) =>
                  new Date(value).toLocaleString('ru-RU'),
              },
              {
                title: 'Пользователь',
                dataIndex: 'adUsername',
                width: 140,
                render: (value: string | null) => value ?? '—',
              },
              {
                title: 'Действие',
                dataIndex: 'action',
                width: 180,
                render: (value: string) => (
                  <Tag color="gold">{AUDIT_ACTION_LABELS[value] ?? value}</Tag>
                ),
              },
              {
                title: 'Описание',
                dataIndex: 'displayName',
                ellipsis: true,
                render: (value: string | null) => value ?? '—',
              },
            ]}
          />
        </ConfigProvider>
      </SettingsSectionCard>
    </div>
  );
}
