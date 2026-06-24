'use client';

import { Calendar, ChevronRight, FileBadge2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import { CertificateDetailDialog } from '@/components/certificates/certificate-detail-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dayjs from '@/lib/dayjs-config';
import {
  getDaysLeftLabel,
  getUrgencyBadgeClass,
  URGENCY_LABELS,
} from '@/lib/certificate-expiry';
import { cn } from '@/lib/utils';
import type { DashboardAttentionCert } from '@/types/dashboard-types';
import Link from 'next/link';

type DashboardAttentionListProps = {
  items: DashboardAttentionCert[];
};

export function DashboardAttentionList({ items }: DashboardAttentionListProps) {
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

      <Card className="flex h-full flex-col border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-amber-700" />
              <CardTitle className="text-base font-semibold">
                Требуют внимания
              </CardTitle>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              По одному актуальному сертификату на сотрудника — без учёта
              архивных
            </p>
          </div>
          <Link
            href="/certificates"
            className="text-xs font-medium text-amber-800 hover:underline"
          >
            Все сертификаты
          </Link>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 p-0">
          {items.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                <FileBadge2 className="size-5" />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">
                Срочных сертификатов нет
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Нет сотрудников, у которых актуальный сертификат истекает или
                отсутствует действующий.
              </p>
            </div>
          ) : (
            <div className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto px-4 py-4">
              {items.map((cert) => (
                <button
                  key={cert.id}
                  type="button"
                  onClick={() => openCertificate(cert.id)}
                  className={cn(
                    'group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border/70',
                    'bg-background/80 px-4 py-3 text-left transition-all duration-150',
                    'hover:border-amber-300/80 hover:bg-amber-50/80 hover:shadow-sm',
                  )}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground transition-colors group-hover:border-amber-200 group-hover:bg-amber-100/80 group-hover:text-amber-800">
                    <FileBadge2 className="size-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground group-hover:text-amber-950">
                      {cert.subjectCN}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {cert.employeeName ?? 'Без сотрудника'}
                      {cert.contextLabel ? ` · ${cert.contextLabel}` : ''}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/80">
                      {cert.serialNumber}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5',
                        getUrgencyBadgeClass(cert.urgency),
                      )}
                    >
                      <Calendar className="size-3.5 shrink-0 opacity-80" />
                      <span className="text-sm font-bold tabular-nums leading-none">
                        {dayjs(cert.validTo).format('DD.MM.YYYY')}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground group-hover:text-amber-900/70">
                      {getDaysLeftLabel(cert.daysLeft)}
                    </span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        getUrgencyBadgeClass(cert.urgency),
                      )}
                    >
                      {URGENCY_LABELS[cert.urgency]}
                    </span>
                  </div>

                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-700" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
