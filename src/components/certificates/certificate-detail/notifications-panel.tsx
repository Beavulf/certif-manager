'use client';

import { BellRing, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCertificateNotificationLogs } from '@/hooks/use-certificate-documents';
import dayjs from '@/lib/dayjs-config';
import { cn } from '@/lib/utils';

type CertificateNotificationsPanelProps = {
  certificateId: string;
  enabled?: boolean;
};

export function CertificateNotificationsPanel({
  certificateId,
  enabled = true,
}: CertificateNotificationsPanelProps) {
  const { data: logs = [], isPending, isError, refetch } =
    useCertificateNotificationLogs(certificateId, enabled);

  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-3">
      <div className="flex items-center gap-2">
        <BellRing className="size-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold text-foreground">
          История уведомлений
        </h4>
        <span className="rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
          {logs.length}
        </span>
      </div>

      <div className="mt-2 space-y-1.5">
        {isPending && (
          <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Загрузка истории…
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
            Не удалось загрузить историю
            <Button
              type="button"
              variant="link"
              size="sm"
              className="ml-2 h-auto cursor-pointer p-0 text-xs"
              onClick={() => refetch()}
            >
              Повторить
            </Button>
          </div>
        )}

        {!isPending && !isError && logs.length === 0 && (
          <p className="rounded-lg border border-dashed border-border/80 px-3 py-2.5 text-xs text-muted-foreground">
            Уведомления по этому сертификату ещё не отправлялись
          </p>
        )}

        {!isPending &&
          logs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg border border-border/60 bg-accent/20 px-2.5 py-2"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                <span className="font-medium text-foreground">
                  {dayjs(log.sentAt).format('DD.MM.YYYY HH:mm')}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  за {log.daysBeforeExpiry} дн. до истечения
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="truncate text-foreground">{log.sentTo}</span>
              </div>
              <p
                className={cn(
                  'mt-1 text-[11px] font-medium',
                  log.status === 'sent' ? 'text-emerald-700' : 'text-red-600',
                )}
              >
                {log.status === 'sent' ? 'Отправлено' : 'Ошибка отправки'}
                {log.errorMessage ? `: ${log.errorMessage}` : ''}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}
