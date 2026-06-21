'use client';

import {
  Building2,
  Calendar,
  Download,
  FileBadge2,
  Fingerprint,
  Hash,
  Link2,
  Loader2,
  Mail,
  MessageSquare,
  Unlink,
  User,
  UserX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { EmployeeSelect } from '@/components/certificates/upload-dialog/employee-select';
import { CertificateDocumentsPanel } from '@/components/certificates/certificate-detail/documents-panel';
import { DetailRow } from '@/components/certificates/certificate-detail/detail-row';
import { CertificateNotificationsPanel } from '@/components/certificates/certificate-detail/notifications-panel';
import dayjs from '@/lib/dayjs-config';
import { cn } from '@/lib/utils';
import {
  useDownloadCertificate,
  useGetCertificateById,
  useUpdateCertificateEmployee,
  useUpdateCertificateNotes,
} from '@/hooks/use-certificate';
import {
  daysUntilExpiry,
  getExpiryUrgency,
  getUrgencyBadgeClass,
  STATUS_LABELS,
  DEFAULT_EXPIRY_THRESHOLDS,
} from '@/lib/certificate-expiry';
import { usePublicAppSettings } from '@/hooks/use-settings';

function formatDate(value: Date | string): string {
  return dayjs(value).format('DD.MM.YYYY');
}

const CERT_TYPE_LABELS = {
  cer: 'CER',
  p7b: 'P7B',
} as const;

type CertificateDetailDialogProps = {
  certificateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getMutationErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  const err = error as { error?: string };
  return err.error ?? 'Не удалось выполнить операцию';
}

export function CertificateDetailDialog({
  certificateId,
  open,
  onOpenChange,
}: CertificateDetailDialogProps) {
  const { data, isPending, isError, error, refetch } = useGetCertificateById(
    certificateId,
    open,
  );
  const { mutateAsync: updateEmployee, isPending: isUpdatingEmployee } =
    useUpdateCertificateEmployee();
  const { mutateAsync: updateNotes, isPending: isUpdatingNotes } =
    useUpdateCertificateNotes();
  const { mutateAsync: downloadCertificate, isPending: isDownloading } =
    useDownloadCertificate();
  const { data: appSettings } = usePublicAppSettings();
  const expiryThresholds = appSettings
    ? { warningDays: appSettings.warningDays, criticalDays: appSettings.criticalDays }
    : DEFAULT_EXPIRY_THRESHOLDS;

  const [editingBinding, setEditingBinding] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [unassignConfirm, setUnassignConfirm] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  const resetBindingUi = () => {
    setEditingBinding(false);
    setSelectedEmployeeId('');
    setUnassignConfirm(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetBindingUi();
    onOpenChange(next);
  };

  useEffect(() => {
    if (!open || !isError) return;
    if (error instanceof Error) {
      toast.error(error.message);
      return;
    }
    const err = error as { error?: string };
    toast.error(err.error ?? 'Не удалось загрузить сертификат');
  }, [open, isError, error]);

  useEffect(() => {
    setNotesDraft(data?.notes ?? '');
  }, [data?.notes, data?.id]);

  const startEditingBinding = () => {
    setSelectedEmployeeId(data?.employee?.id ?? '');
    setUnassignConfirm(false);
    setEditingBinding(true);
  };

  const cancelEditingBinding = () => {
    setEditingBinding(false);
    setSelectedEmployeeId('');
    setUnassignConfirm(false);
  };

  const handleSaveBinding = async () => {
    if (!certificateId || !selectedEmployeeId) {
      toast.error('Выберите сотрудника');
      return;
    }
    if (data?.employee?.id === selectedEmployeeId) {
      toast.info('Сотрудник не изменился');
      cancelEditingBinding();
      return;
    }
    try {
      await updateEmployee({
        certificateId,
        employeeId: selectedEmployeeId,
      });
      toast.success(
        data?.employee
          ? 'Привязка к сотруднику изменена'
          : 'Сертификат привязан к сотруднику',
      );
      cancelEditingBinding();
    } catch (err) {
      toast.error(getMutationErrorMessage(err));
    }
  };

  const handleUnassign = async () => {
    if (!certificateId) return;
    try {
      await updateEmployee({ certificateId, employeeId: null });
      toast.success('Сертификат отвязан от сотрудника');
      setUnassignConfirm(false);
      cancelEditingBinding();
    } catch (err) {
      toast.error(getMutationErrorMessage(err));
    }
  };

  const handleSaveNotes = async () => {
    if (!certificateId) return;
    const next = notesDraft.trim();
    const current = (data?.notes ?? '').trim();
    if (next === current) return;

    try {
      await updateNotes({
        certificateId,
        notes: next || null,
      });
      toast.success('Примечание сохранено');
    } catch (err) {
      toast.error(getMutationErrorMessage(err));
      setNotesDraft(data?.notes ?? '');
    }
  };

  const handleDownload = async () => {
    if (!certificateId) return;
    try {
      const payload = await downloadCertificate(certificateId);
      if (!payload) return;
      const { url, fileName } = payload;
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.rel = 'noopener noreferrer';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error(getMutationErrorMessage(err));
    }
  };

  const daysLeft = data ? daysUntilExpiry(data.validTo) : null;
  const bindingBusy = isUpdatingEmployee;
  const notesBusy = isUpdatingNotes;
  const validityCopyText = data
    ? `${formatDate(data.validFrom)} — ${formatDate(data.validTo)}`
    : undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-6">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
              <FileBadge2 className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg leading-snug">
                {isPending ? 'Загрузка…' : (data?.subjectCN ?? 'Сертификат')}
              </DialogTitle>
            </div>
            {data && (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-medium',
                  getUrgencyBadgeClass(getExpiryUrgency(data, expiryThresholds)),
                )}
              >
                {STATUS_LABELS[data.status]}
              </span>
            )}
          </div>
        </DialogHeader>

        {isPending && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Загрузка данных…</span>
          </div>
        )}

        {!isPending && data && certificateId && (
          <div className="space-y-3">
            <section className="rounded-xl border border-border/70 bg-accent/30 p-3.5">
              <h3 className="text-sm font-semibold text-foreground">
                Привязка к сотруднику
              </h3>

              {editingBinding ? (
                <div className="mt-3 space-y-3">
                  <EmployeeSelect
                    allowEmpty={false}
                    value={selectedEmployeeId}
                    onValueChange={setSelectedEmployeeId}
                    disabled={bindingBusy}
                  />
                  <p className="text-xs text-muted-foreground">
                    ФИО сотрудника должно совпадать с данными сертификата:{' '}
                    <span className="font-medium text-foreground">
                      {data.subjectCN}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="cursor-pointer"
                      disabled={!selectedEmployeeId || bindingBusy}
                      onClick={handleSaveBinding}
                    >
                      {bindingBusy ? (
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
                      disabled={bindingBusy}
                      onClick={cancelEditingBinding}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {data.employee ? (
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <User className="size-4 shrink-0 text-muted-foreground" />
                        {data.employee.fullName}
                      </div>
                      <p className="pl-6 text-sm text-muted-foreground">
                        {data.employee.email}
                      </p>
                      {(data.employee.department || data.employee.adUsername) && (
                        <p className="flex flex-wrap items-center gap-1 pl-6 text-xs text-muted-foreground">
                          {data.employee.department && (
                            <>
                              <Building2 className="size-3.5" />
                              {data.employee.department}
                              {data.employee.position
                                ? ` · ${data.employee.position}`
                                : ''}
                            </>
                          )}
                          {data.employee.adUsername && (
                            <span className="font-mono">
                              {data.employee.department ? ' · ' : ''}
                              {data.employee.adUsername}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-dashed border-border bg-background/60 px-3 py-2.5">
                      <UserX className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Не привязан к сотруднику
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Сертификат загружен без связи с записью сотрудника
                        </p>
                      </div>
                    </div>
                  )}

                  {unassignConfirm && data.employee ? (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50/80 px-3 py-2.5">
                      <p className="text-sm text-foreground">
                        Отвязать сертификат от{' '}
                        <span className="font-medium">
                          {data.employee.fullName}
                        </span>
                        ?
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="cursor-pointer"
                          disabled={bindingBusy}
                          onClick={handleUnassign}
                        >
                          {bindingBusy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Unlink className="size-4" />
                          )}
                          Да, отвязать
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          disabled={bindingBusy}
                          onClick={() => setUnassignConfirm(false)}
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="cursor-pointer"
                        disabled={bindingBusy}
                        onClick={startEditingBinding}
                      >
                        <Link2 className="size-4" />
                        {data.employee
                          ? 'Изменить привязку'
                          : 'Привязать к сотруднику'}
                      </Button>
                      {data.employee && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          disabled={bindingBusy}
                          onClick={() => setUnassignConfirm(true)}
                        >
                          <Unlink className="size-4" />
                          Отвязать
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="rounded-xl border border-border/70 bg-background/70 p-3.5">
              <h3 className="text-sm font-semibold text-foreground">
                Данные сертификата
              </h3>
              <div className="mt-1 divide-y divide-border/60">
                <DetailRow
                  icon={Hash}
                  label="Серийный номер"
                  value={data.serialNumber}
                  copyValue={data.serialNumber}
                  mono
                />
                {data.thumbprint && (
                  <DetailRow
                    icon={Fingerprint}
                    label="Отпечаток"
                    value={data.thumbprint}
                    copyValue={data.thumbprint}
                    mono
                  />
                )}
                {data.issuer && (
                  <DetailRow
                    icon={Building2}
                    label="Издатель"
                    value={data.issuer}
                    copyValue={data.issuer}
                  />
                )}
                <DetailRow
                  icon={Calendar}
                  label="Период действия"
                  copyValue={validityCopyText}
                  value={
                    <>
                      {formatDate(data.validFrom)} — {formatDate(data.validTo)}
                      {daysLeft !== null && (
                        <span
                          className={cn(
                            'ml-2 text-xs font-normal',
                            daysLeft < 0
                              ? 'text-red-600'
                              : daysLeft <= 30
                                ? 'text-amber-700'
                                : 'text-muted-foreground',
                          )}
                        >
                          {daysLeft < 0
                            ? `(истёк ${Math.abs(daysLeft)} дн. назад)`
                            : daysLeft === 0
                              ? '(истекает сегодня)'
                              : `(осталось ${daysLeft} дн.)`}
                        </span>
                      )}
                    </>
                  }
                />
                <DetailRow
                  icon={FileBadge2}
                  label="Тип файла"
                  value={CERT_TYPE_LABELS[data.certType]}
                />
                {data.subjectEmail && (
                  <DetailRow
                    icon={Mail}
                    label="Email в сертификате"
                    value={data.subjectEmail}
                    copyValue={data.subjectEmail}
                  />
                )}
              </div>
            </section>

            <section className="rounded-xl border border-border/70 bg-accent/20 p-3.5">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Загрузка</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {data.uploadedBy}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {dayjs(data.uploadedAt).format('DD.MM.YYYY HH:mm')}
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="certificate-notes"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <MessageSquare className="size-3.5" />
                    Примечание
                  </label>
                  <Input
                    id="certificate-notes"
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    onBlur={handleSaveNotes}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    disabled={notesBusy}
                    placeholder="Добавить комментарий…"
                    maxLength={255}
                    className="mt-1.5 h-9 border-border/70 bg-background text-sm"
                  />
                </div>
              </div>
            </section>

            <div className="grid gap-3 lg:grid-cols-2">
              <CertificateDocumentsPanel
                certificateId={certificateId}
                enabled={open}
              />
              <CertificateNotificationsPanel
                certificateId={certificateId}
                enabled={open}
              />
            </div>
          </div>
        )}

        {!isPending && isError && (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Не удалось загрузить сертификат
            <Button
              variant="outline"
              size="sm"
              className="mt-3 cursor-pointer"
              onClick={() => refetch()}
            >
              Повторить
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {data && (
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={isPending || isDownloading || bindingBusy}
              onClick={handleDownload}
            >
              {isDownloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Скачать сертификат
            </Button>
          )}
          <DialogClose
            render={
              <Button
                variant="outline"
                className="cursor-pointer sm:ml-auto"
                disabled={isPending || bindingBusy || notesBusy}
              >
                Закрыть
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
