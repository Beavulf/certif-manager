'use client';

import { CalendarDays, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import { CertificateDetailDialog } from '@/components/certificates/certificate-detail-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dayjs from '@/lib/dayjs-config';
import { cn } from '@/lib/utils';
import type { DashboardExpiryCalendar } from '@/types/dashboard-types';

type DashboardExpiryCalendarProps = {
  calendar: DashboardExpiryCalendar;
};

export function DashboardExpiryCalendarPanel({
  calendar,
}: DashboardExpiryCalendarProps) {
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const maxCount = useMemo(
    () => Math.max(1, ...calendar.weeks.map((week) => week.count)),
    [calendar.weeks],
  );

  const activeWeek = calendar.weeks[activeWeekIndex] ?? calendar.weeks[0];

  const openCertificate = (id: string) => {
    setCertificateId(id);
    setDetailOpen(true);
  };

  return (
    <>
      <CertificateDetailDialog
        certificateId={certificateId}
        open={detailOpen}
        onOpenChange={(next) => {
          setDetailOpen(next);
          if (!next) setCertificateId(null);
        }}
      />

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-amber-700" />
              <CardTitle className="text-base font-semibold">
                Календарь истечений
              </CardTitle>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {calendar.totalInRange > 0
                ? `${calendar.totalInRange} актуальных сертификатов истекают в ближайшие 4 недели`
                : 'В ближайший месяц истечений не ожидается'}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {calendar.weeks.map((week, index) => {
              const isActive = index === activeWeekIndex;
              const barWidth = `${Math.round((week.count / maxCount) * 100)}%`;

              return (
                <button
                  key={week.weekStart}
                  type="button"
                  onClick={() => setActiveWeekIndex(index)}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-left transition-colors',
                    isActive
                      ? 'border-amber-300/80 bg-amber-50/70'
                      : 'border-border/70 bg-background/60 hover:bg-accent/40',
                  )}
                >
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {week.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {week.count}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        week.count > 0 ? 'bg-amber-600' : 'bg-muted-foreground/20',
                      )}
                      style={{ width: barWidth }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {activeWeek && activeWeek.items.length > 0 ? (
            <div className="max-h-[min(280px,40vh)] space-y-1.5 overflow-y-auto rounded-xl border border-border/70 bg-muted/15 p-2">
              {activeWeek.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openCertificate(item.id)}
                  className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border/70 hover:bg-background"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.employeeName ?? item.subjectCN}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {item.employeeName ? item.subjectCN : 'Без привязки'} ·{' '}
                      {dayjs(item.validTo).format('DD.MM.YYYY')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums',
                      item.daysLeft <= 7
                        ? 'bg-red-100 text-red-800'
                        : item.daysLeft <= 14
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-800',
                    )}
                  >
                    {item.daysLeft === 0
                      ? 'Сегодня'
                      : item.daysLeft === 1
                        ? '1 день'
                        : `${item.daysLeft} дн.`}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
              На выбранной неделе истечений нет
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
