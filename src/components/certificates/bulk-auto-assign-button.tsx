'use client';

import { Link2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Popconfirm } from 'antd';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBulkAutoAssignCertificates } from '@/hooks/use-certificate';
import { showActionError } from '@/lib/toast-messages';
import type { BulkAutoAssignReport } from '@/types/certificate-auto-assign-types';
import { cn } from '@/lib/utils';

type BulkAutoAssignCertificatesButtonProps = {
  unassignedCount: number;
  disabled?: boolean;
  className?: string;
};

function SummaryRow({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'success' | 'warning' | 'muted';
}) {
  const valueClass =
    tone === 'success'
      ? 'text-emerald-700'
      : tone === 'warning'
        ? 'text-amber-800'
        : tone === 'muted'
          ? 'text-muted-foreground'
          : 'text-foreground';

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/80 px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-semibold tabular-nums', valueClass)}>
        {value}
      </span>
    </div>
  );
}

function AutoAssignReportDialog({
  open,
  onOpenChange,
  report,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: BulkAutoAssignReport | null;
}) {
  if (!report) return null;

  const assignedTotal = report.assignedFromDb + report.createdAndAssigned;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border/70 px-6 py-4 text-left">
          <DialogTitle>Результат автопривязки</DialogTitle>
          <DialogDescription>
            Обработано непривязанных сертификатов: {report.unassignedTotal}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <SummaryRow
              label="Привязано к сотрудникам из базы"
              value={report.assignedFromDb}
              tone="success"
            />
            <SummaryRow
              label="Создано сотрудников и привязано"
              value={report.createdAndAssigned}
              tone="success"
            />
            <SummaryRow
              label="Всего успешно привязано"
              value={assignedTotal}
              tone="success"
            />
            <SummaryRow
              label="Пропущено"
              value={report.skippedCount}
              tone={report.skippedCount > 0 ? 'warning' : 'muted'}
            />
          </div>

          {report.successes.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold text-foreground">
                Успешно привязаны ({report.successes.length})
              </h3>
              <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border/70 bg-muted/15 p-3">
                {report.successes.map((item) => (
                  <li
                    key={item.certificateId}
                    className="text-sm leading-snug text-foreground"
                  >
                    <span className="font-medium">{item.subjectCN}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      · {item.serialNumber}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.action === 'created_and_assigned'
                        ? `Создан сотрудник: ${item.employeeName}`
                        : `Сотрудник из базы: ${item.employeeName}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {report.issues.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold text-foreground">
                Не удалось привязать ({report.issues.length})
              </h3>
              <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-amber-200/70 bg-amber-50/40 p-3">
                {report.issues.map((item) => (
                  <li
                    key={item.certificateId}
                    className="text-sm leading-snug text-foreground"
                  >
                    <span className="font-medium">{item.subjectCN}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      · {item.serialNumber}
                    </span>
                    <span className="mt-0.5 block text-xs text-amber-900/80">
                      {item.reason}
                      {item.message ? ` — ${item.message}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/70 px-6 py-4">
          <Button
            type="button"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BulkAutoAssignCertificatesButton({
  unassignedCount,
  disabled = false,
  className,
}: BulkAutoAssignCertificatesButtonProps) {
  const { mutateAsync, isPending } = useBulkAutoAssignCertificates();
  const [report, setReport] = useState<BulkAutoAssignReport | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const handleConfirm = async () => {
    try {
      const result = await mutateAsync();
      if (!result) return;
      setReport(result);
      setReportOpen(true);
    } catch (error) {
      showActionError(error, 'Автопривязка сертификатов');
    }
  };

  const busy = isPending || disabled;

  return (
    <>
      <Popconfirm
        title="Автопривязать непривязанные сертификаты?"
        description={`Будет обработано ${unassignedCount} сертификатов: поиск сотрудника в базе, при необходимости — в AD с созданием записи.`}
        okText="Запустить"
        cancelText="Отмена"
        okButtonProps={{ loading: isPending }}
        onConfirm={handleConfirm}
        disabled={busy || unassignedCount === 0}
        placement="bottomRight"
      >
        <span className={cn('inline-flex', className)}>
          <Button
            type="button"
            variant="outline"
            className="h-11 cursor-pointer gap-2"
            disabled={busy || unassignedCount === 0}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Link2 className="size-4 shrink-0" />
            )}
            Автопривязка
            {unassignedCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                {unassignedCount}
              </span>
            ) : null}
          </Button>
        </span>
      </Popconfirm>

      <AutoAssignReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        report={report}
      />
    </>
  );
}
