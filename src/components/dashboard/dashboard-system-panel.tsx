'use client';

import {
  Bell,
  CheckCircle2,
  Clock3,
  Database,
  HardDrive,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SystemStatus } from '@/types/settings-types';

type DashboardSystemPanelProps = {
  systemStatus: SystemStatus;
  notificationsEnabled: boolean;
};

function StatusRow({
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
        'flex items-start gap-3 rounded-xl border px-3.5 py-3',
        ok
          ? 'border-emerald-200/70 bg-emerald-50/40'
          : 'border-red-200/80 bg-red-50/50',
      )}
    >
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background/80',
          ok ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700',
        )}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {ok ? (
            <CheckCircle2 className="size-3.5 text-emerald-600" />
          ) : (
            <XCircle className="size-3.5 text-red-600" />
          )}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  );
}

export function DashboardSystemPanel({
  systemStatus,
  notificationsEnabled,
}: DashboardSystemPanelProps) {
  const allOk =
    systemStatus.database.ok &&
    systemStatus.minio.ok &&
    systemStatus.cron.lastCheck.ok &&
    notificationsEnabled;

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-4">
        <CardTitle className="text-base font-semibold">Система</CardTitle>
        <Link
          href="/settings"
          className="text-xs font-medium text-amber-800 hover:underline"
        >
          Настройки
        </Link>
      </CardHeader>

      <CardContent className="space-y-2 p-4">
        <StatusRow
          title="База данных"
          ok={systemStatus.database.ok}
          message={systemStatus.database.message}
          icon={Database}
        />
        <StatusRow
          title="MinIO (файлы)"
          ok={systemStatus.minio.ok}
          message={systemStatus.minio.message}
          icon={HardDrive}
        />
        <StatusRow
          title="Уведомления"
          ok={notificationsEnabled}
          message={
            notificationsEnabled
              ? 'Email-напоминания включены'
              : 'Отправка отключена в настройках'
          }
          icon={Bell}
        />
        <StatusRow
          title="Cron-проверка"
          ok={systemStatus.cron.lastCheck.ok}
          message={`${systemStatus.cron.nextDescription}. ${systemStatus.cron.lastCheck.message}`}
          icon={Clock3}
        />

        <p
          className={cn(
            'pt-1 text-center text-xs font-medium',
            allOk ? 'text-emerald-700' : 'text-amber-800',
          )}
        >
          {allOk ? 'Все системы в норме' : 'Есть элементы, требующие внимания'}
        </p>
      </CardContent>
    </Card>
  );
}
