'use client';

import {
  Building2,
  Calendar,
  Download,
  FileBadge2,
  Fingerprint,
  Hash,
  KeyRound,
  Link2,
  Loader2,
  Mail,
  MessageSquare,
  ShieldBan,
  Unlink,
  User,
  UserX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfigProvider, Popconfirm } from 'antd';

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
import { downloadFileFromUrl } from '@/lib/download-client';
import { cn } from '@/lib/utils';
import {
  useDownloadCertificate,
  useGetCertificateById,
  useRevokeCertificate,
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
import { formatSubjectKeyId } from '@/minio/parse-cert';
import { usePublicAppSettings } from '@/hooks/use-settings';
import { showActionError, showActionSuccess, showValidationError } from '@/lib/toast-messages';

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
  const { mutateAsync: revokeCertificate, isPending: isRevoking } =
    useRevokeCertificate();
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
    showActionError(
      error,
      'Загрузка карточки сертификата',
      'Не удалось загрузить данные сертификата',
    );
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
      showValidationError(
        'Сотрудник не выбран',
        'Выберите сотрудника из списка для привязки сертификата',
      );
      return;
    }
    if (data?.employee?.id === selectedEmployeeId) {
      showValidationError('Привязка не изменилась', 'Выбран тот же сотрудник, что уже привязан');
      cancelEditingBinding();
      return;
    }
    try {
      await updateEmployee({
        certificateId,
        employeeId: selectedEmployeeId,
      });
      showActionSuccess(
        data?.employee ? 'Привязка изменена' : 'Сертификат привязан',
        data?.employee
          ? `Новый сотрудник назначен для ${data.serialNumber}`
          : `Сертификат ${data?.serialNumber ?? ''} привязан к сотруднику`,
      );
      cancelEditingBinding();
    } catch (err) {
      showActionError(err, 'Привязка сертификата к сотруднику', 'Не удалось изменить привязку');
    }
  };

  const handleUnassign = async () => {
    if (!certificateId) return;
    try {
      await updateEmployee({ certificateId, employeeId: null });
      showActionSuccess(
        'Сертификат отвязан',
        data?.employee
          ? `От сотрудника ${data.employee.fullName} (${data.serialNumber})`
          : undefined,
      );
      setUnassignConfirm(false);
      cancelEditingBinding();
    } catch (err) {
      showActionError(err, 'Отвязка сертификата', 'Не удалось отвязать сертификат от сотрудника');
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
      showActionSuccess(
        'Примечание сохранено',
        data?.serialNumber ? `Сертификат ${data.serialNumber}` : undefined,
      );
    } catch (err) {
      showActionError(err, 'Сохранение примечания', 'Не удалось сохранить примечание');
      setNotesDraft(data?.notes ?? '');
    }
  };

  const handleDownload = async () => {
    if (!certificateId) return;
    try {
      const payload = await downloadCertificate(certificateId);
      if (!payload) return;
      const { url, fileName } = payload;
      await downloadFileFromUrl(url, fileName);
      showActionSuccess(
        'Сертификат скачан',
        data ? `${data.subjectCN} · ${fileName}` : fileName,
      );
    } catch (err) {
      showActionError(err, 'Скачивание сертификата', 'Не удалось скачать файл сертификата');
    }
  };

  const handleRevoke = async () => {
    if (!certificateId) return;
    try {
      const revoked = await revokeCertificate(certificateId);
      showActionSuccess(
        'Сертификат отозван',
        revoked ? `${revoked.subjectCN} · ${revoked.serialNumber}` : undefined,
      );
      resetBindingUi();
    } catch (err) {
      showActionError(err, 'Отзыв сертификата', 'Не удалось отозвать сертификат');
    }
  };

  const daysLeft = data ? daysUntilExpiry(data.validTo) : null;
  const isRevoked = data?.status === 'revoked';
  const bindingBusy = isUpdatingEmployee;
  const notesBusy = isUpdatingNotes;
  const actionsBusy = isDownloading || isRevoking || bindingBusy;
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
            {isRevoked && (
              <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700">
                <ShieldBan className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-medium text-slate-900">Сертификат отозван</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    Не участвует в уведомлениях и блоке «Требуют внимания».
                    Привязку к сотруднику изменить нельзя — можно только отвязать
                    или удалить запись.
                  </p>
                </div>
              </div>
            )}

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
                      {!isRevoked && (
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
                      )}
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
                {data.subjectKeyId && (
                  <DetailRow
                    icon={KeyRound}
                    label="Идентификатор ключа субъекта"
                    value={formatSubjectKeyId(data.subjectKeyId)}
                    copyValue={data.subjectKeyId}
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
                      {isRevoked ? (
                        <span className="ml-2 text-xs font-normal text-slate-600">
                          (отозван)
                        </span>
                      ) : daysLeft !== null ? (
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
                      ) : null}
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
          <div className="flex flex-wrap gap-2">
            {data && (
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={isPending || actionsBusy || notesBusy}
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
            {data && !isRevoked && (
              <ConfigProvider
                theme={{
                  token: { colorPrimary: '#f59e0b', borderRadius: 10 },
                }}
              >
                <Popconfirm
                  title="Отозвать сертификат?"
                  description={`«${data.subjectCN}» перестанет участвовать в уведомлениях и мониторинге сроков. Действие необратимо.`}
                  okText="Отозвать"
                  cancelText="Отмена"
                  okButtonProps={{ danger: true, loading: isRevoking }}
                  onConfirm={handleRevoke}
                >
                  <span className="inline-flex">
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      disabled={isPending || actionsBusy || notesBusy}
                    >
                      {isRevoking ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ShieldBan className="size-4" />
                      )}
                      Отозвать
                    </Button>
                  </span>
                </Popconfirm>
              </ConfigProvider>
            )}
          </div>
          <DialogClose
            render={
              <Button
                variant="outline"
                className="cursor-pointer sm:ml-auto"
                disabled={isPending || actionsBusy || notesBusy}
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
