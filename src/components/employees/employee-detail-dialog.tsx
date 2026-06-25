'use client';

import { ConfigProvider, Tag } from 'antd';
import {
  Building2,
  Calendar,
  ChevronRight,
  FileBadge2,
  History,
  Link2,
  Loader2,
  Mail,
  Pencil,
  RefreshCw,
  User,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { AssignableCertificateSelect } from '@/components/employees/assignable-certificate-select';
import { CertificateDetailDialog } from '@/components/certificates/certificate-detail-dialog';
import { DetailRow } from '@/components/certificates/certificate-detail/detail-row';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateCertificateEmployee } from '@/hooks/use-certificate';
import { useGetEmployeeDetail, useEmployeeActivity, useSyncEmployeeFromAd } from '@/hooks/use-employee';
import { usePublicAppSettings } from '@/hooks/use-settings';
import dayjs from '@/lib/dayjs-config';
import {
  daysUntilExpiry,
  DEFAULT_EXPIRY_THRESHOLDS,
  getDaysLeftLabel,
  getExpiryUrgency,
  getUrgencyBadgeClass,
  URGENCY_LABELS,
} from '@/lib/certificate-expiry';
import {
  countActiveCertificates,
  type EmployeeCertificateSummary,
} from '@/lib/employee-table-utils';
import { isEmployeeDataStale } from '@/lib/employee-presets';
import { showActionError, showActionSuccess } from '@/lib/toast-messages';
import { cn } from '@/lib/utils';

type EmployeeDetailDialogProps = {
  employeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (employeeId: string) => void;
};

function CertificateListItem({
  cert,
  expiryThresholds,
  onOpen,
}: {
  cert: EmployeeCertificateSummary;
  expiryThresholds: { warningDays: number; criticalDays: number };
  onOpen: (id: string) => void;
}) {
  const urgency = getExpiryUrgency(
    { status: cert.status, validTo: cert.validTo },
    expiryThresholds,
  );
  const daysLeft = daysUntilExpiry(cert.validTo);
  const formattedDate = dayjs(cert.validTo).format('DD.MM.YYYY');

  return (
    <button
      type="button"
      onClick={() => onOpen(cert.id)}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border/70',
        'bg-background/80 px-4 py-3.5 text-left transition-all duration-150',
        'hover:border-amber-300/80 hover:bg-amber-50/80 hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40',
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground transition-colors group-hover:border-amber-200 group-hover:bg-amber-100/80 group-hover:text-amber-800">
        <FileBadge2 className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground group-hover:text-amber-950">
          {cert.subjectCN}
        </p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
          {cert.serialNumber}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5',
            getUrgencyBadgeClass(urgency),
          )}
        >
          <Calendar className="size-3.5 shrink-0 opacity-80" />
          <span className="text-sm font-bold tabular-nums leading-none">
            {formattedDate}
          </span>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground group-hover:text-amber-900/70">
          {getDaysLeftLabel(daysLeft)}
        </span>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-medium',
            getUrgencyBadgeClass(urgency),
          )}
        >
          {URGENCY_LABELS[urgency]}
        </span>
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-700" />
    </button>
  );
}

function getNearestActiveCertificate(
  certificates: EmployeeCertificateSummary[],
): EmployeeCertificateSummary | null {
  const active = certificates.filter((cert) => cert.status === 'active');
  if (active.length === 0) return null;

  return [...active].sort(
    (a, b) => new Date(a.validTo).getTime() - new Date(b.validTo).getTime(),
  )[0];
}

export function EmployeeDetailDialog({
  employeeId,
  open,
  onOpenChange,
  onEdit,
}: EmployeeDetailDialogProps) {
  const { data, isPending, isError, refetch } = useGetEmployeeDetail(
    employeeId,
    open,
  );
  const { data: appSettings } = usePublicAppSettings();
  const expiryThresholds = appSettings
    ? { warningDays: appSettings.warningDays, criticalDays: appSettings.criticalDays }
    : DEFAULT_EXPIRY_THRESHOLDS;

  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [bindingOpen, setBindingOpen] = useState(false);
  const [selectedCertificateId, setSelectedCertificateId] = useState('');

  const { mutateAsync: assignCertificate, isPending: isAssigning } =
    useUpdateCertificateEmployee();
  const { mutateAsync: syncFromAd, isPending: isSyncing } = useSyncEmployeeFromAd();
  const { data: activity = [], isPending: isActivityPending } = useEmployeeActivity(
    employeeId,
    open,
  );

  const nearestCertificate = useMemo(
    () => (data ? getNearestActiveCertificate(data.certificates) : null),
    [data],
  );

  const nearestDaysLeft = nearestCertificate
    ? daysUntilExpiry(nearestCertificate.validTo)
    : null;

  const isStale = data
    ? isEmployeeDataStale(data.updatedAt, data.adUsername)
    : false;

  useEffect(() => {
    if (!open) {
      setBindingOpen(false);
      setSelectedCertificateId('');
    }
  }, [open]);

  const openCertificate = (id: string) => {
    setCertificateId(id);
    setCertificateOpen(true);
  };

  const handleAssignCertificate = async () => {
    if (!data || !selectedCertificateId) return;

    try {
      const assigned = await assignCertificate({
        certificateId: selectedCertificateId,
        employeeId: data.id,
      });
      showActionSuccess(
        'Сертификат привязан',
        assigned
          ? `${assigned.subjectCN} · ${assigned.serialNumber}`
          : data.fullName,
      );
      setBindingOpen(false);
      setSelectedCertificateId('');
      await refetch();
    } catch (error) {
      showActionError(error, 'Привязка сертификата');
    }
  };

  const handleSyncFromAd = async () => {
    if (!data) return;

    try {
      const updated = await syncFromAd(data.id);
      showActionSuccess(
        'Данные обновлены из AD',
        updated ? `${updated.fullName} · ${updated.email}` : undefined,
      );
      await refetch();
    } catch (error) {
      showActionError(error, 'Синхронизация с AD');
    }
  };

  return (
    <>
      <CertificateDetailDialog
        certificateId={certificateId}
        open={certificateOpen}
        onOpenChange={(next) => {
          setCertificateOpen(next);
          if (!next) setCertificateId(null);
        }}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <div className="shrink-0 border-b border-border/70 bg-accent/20 px-6 pb-5 pt-6">
            <DialogHeader className="gap-0 pr-8 text-left">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
                  <User className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-lg leading-snug">
                    {data?.fullName ?? 'Сотрудник'}
                  </DialogTitle>
                  {data && (
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {data.email}
                    </p>
                  )}
                </div>
              </div>

                  {data && (
                <ConfigProvider
                  theme={{
                    token: { colorPrimary: '#b45309', borderRadius: 8 },
                  }}
                >
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag color={data.isActive ? 'green' : 'default'}>
                      {data.isActive ? 'Активен' : 'Неактивен'}
                    </Tag>
                    <Tag color="gold">
                      Сертификатов: {data.certificates.length}
                    </Tag>
                    <Tag color="blue">
                      Активных: {countActiveCertificates(data.certificates)}
                    </Tag>
                    {nearestCertificate && nearestDaysLeft != null ? (
                      <Tag color={nearestDaysLeft <= 7 ? 'red' : 'orange'}>
                        Ближайшее истечение: {getDaysLeftLabel(nearestDaysLeft)}
                      </Tag>
                    ) : null}
                    {isStale ? (
                      <Tag color="volcano">Данные AD устарели</Tag>
                    ) : null}
                  </div>
                </ConfigProvider>
              )}
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {isPending && (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Загрузка…
              </div>
            )}

            {isError && (
              <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                Не удалось загрузить данные сотрудника
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="ml-2 h-auto cursor-pointer p-0"
                  onClick={() => refetch()}
                >
                  Повторить
                </Button>
              </div>
            )}

            {data && (
              <div className="space-y-5">
                <section className="rounded-xl border border-border/70 bg-background/80 p-4 sm:p-5">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Контактные данные
                  </h3>
                  <DetailRow
                    icon={Mail}
                    label="Email"
                    value={
                      <a
                        href={`mailto:${data.email}`}
                        className="text-amber-800 hover:underline"
                      >
                        {data.email}
                      </a>
                    }
                    copyValue={data.email}
                  />
                  <DetailRow
                    icon={User}
                    label="Логин AD"
                    value={data.adUsername ?? '—'}
                  />
                  <DetailRow
                    icon={Building2}
                    label="Отдел и должность"
                    value={
                      data.department
                        ? `${data.department}${data.position ? ` · ${data.position}` : ''}`
                        : data.position ?? '—'
                    }
                  />
                  <DetailRow
                    icon={Calendar}
                    label="Обновлён"
                    value={dayjs(data.updatedAt).format('DD.MM.YYYY HH:mm')}
                  />
                  {data.adUsername ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer gap-1.5"
                        disabled={isSyncing}
                        onClick={handleSyncFromAd}
                      >
                        {isSyncing ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="size-3.5" />
                        )}
                        Обновить из AD
                      </Button>
                      {isStale ? (
                        <span className="text-xs text-amber-800">
                          Рекомендуется синхронизировать данные из Active Directory
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                <section>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileBadge2 className="size-4 text-amber-700" />
                      <h3 className="text-sm font-semibold text-foreground">
                        Сертификаты
                      </h3>
                      <span className="rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {data.certificates.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {data.certificates.length > 0 && !bindingOpen && (
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          Нажмите на строку для просмотра
                        </span>
                      )}
                      {!bindingOpen && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 cursor-pointer gap-1.5"
                          onClick={() => setBindingOpen(true)}
                        >
                          <Link2 className="size-3.5" />
                          Привязать
                        </Button>
                      )}
                    </div>
                  </div>

                  {bindingOpen && (
                    <div className="mb-4 rounded-xl border border-amber-200/70 bg-amber-50/40 p-4">
                      <p className="text-sm font-medium text-foreground">
                        Привязка сертификата
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Доступны только непривязанные сертификаты с ФИО{' '}
                        <span className="font-medium text-foreground">
                          {data.fullName}
                        </span>
                      </p>
                      <div className="mt-3 space-y-3">
                        <AssignableCertificateSelect
                          employeeId={data.id}
                          value={selectedCertificateId}
                          onValueChange={setSelectedCertificateId}
                          disabled={isAssigning}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="cursor-pointer"
                            disabled={!selectedCertificateId || isAssigning}
                            onClick={handleAssignCertificate}
                          >
                            {isAssigning ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Link2 className="size-4" />
                            )}
                            Сохранить
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            disabled={isAssigning}
                            onClick={() => {
                              setBindingOpen(false);
                              setSelectedCertificateId('');
                            }}
                          >
                            Отмена
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {data.certificates.length === 0 && !bindingOpen ? (
                    <div className="rounded-xl border border-dashed border-border/80 bg-accent/20 px-5 py-8 text-center">
                      <FileBadge2 className="mx-auto size-8 text-muted-foreground/60" />
                      <p className="mt-3 text-sm text-muted-foreground">
                        У сотрудника пока нет привязанных сертификатов
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4 cursor-pointer gap-1.5"
                        onClick={() => setBindingOpen(true)}
                      >
                        <Link2 className="size-3.5" />
                        Привязать сертификат
                      </Button>
                    </div>
                  ) : data.certificates.length > 0 ? (
                    <div
                      className={cn(
                        'space-y-2.5',
                        data.certificates.length > 4 &&
                          'max-h-[min(320px,40vh)] overflow-y-auto pr-1',
                      )}
                    >
                      {data.certificates.map((cert) => (
                        <CertificateListItem
                          key={cert.id}
                          cert={cert}
                          expiryThresholds={expiryThresholds}
                          onOpen={openCertificate}
                        />
                      ))}
                    </div>
                  ) : null}
                </section>

                <section className="rounded-xl border border-border/70 bg-background/80 p-4 sm:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <History className="size-4 text-amber-700" />
                    <h3 className="text-sm font-semibold text-foreground">
                      История изменений
                    </h3>
                  </div>
                  {isActivityPending ? (
                    <p className="text-sm text-muted-foreground">Загрузка…</p>
                  ) : activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Событий по этому сотруднику пока нет
                    </p>
                  ) : (
                    <ul
                      className={cn(
                        'space-y-2',
                        activity.length > 3 &&
                          'max-h-[min(240px,32vh)] overflow-y-auto overscroll-contain pr-1',
                      )}
                    >
                      {activity.map((item) => (
                        <li
                          key={item.id}
                          className="rounded-lg border border-border/60 px-3 py-2.5 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-foreground">
                              {item.actionLabel}
                            </span>
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {dayjs(item.createdAt).format('DD.MM.YY HH:mm')}
                            </span>
                          </div>
                          {item.displayName ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.displayName}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </div>

          <DialogFooter
            className={cn(
              '!m-0 shrink-0 gap-3 border-t border-border/70 bg-muted/30 px-6 py-4',
              'flex-col-reverse sm:flex-row sm:justify-end',
            )}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Закрыть
            </Button>
            {data && onEdit && (
              <Button
                type="button"
                onClick={() => onEdit(data.id)}
                className="w-full sm:w-auto"
              >
                <Pencil className="size-4" />
                Редактировать
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
