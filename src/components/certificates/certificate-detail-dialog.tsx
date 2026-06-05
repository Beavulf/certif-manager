'use client';

import {
  Building2,
  Calendar,
  FileBadge2,
  Fingerprint,
  Hash,
  Link2,
  Loader2,
  Mail,
  Unlink,
  User,
  UserX,
} from 'lucide-react';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { EmployeeSelect } from '@/components/certificates/upload-dialog/employee-select';
import dayjs from '@/lib/dayjs-config';
import { cn } from '@/lib/utils';
import {
  useGetCertificateById,
  useUpdateCertificateEmployee,
} from '@/hooks/use-certificate';
import type { CertStatus } from '@/generated/prisma/client';

const STATUS_LABELS: Record<CertStatus, string> = {
  active: 'Активен',
  expired: 'Истёк',
  revoked: 'Отозван',
};

const CERT_TYPE_LABELS = {
  cer: 'CER',
  p7b: 'P7B',
} as const;

function statusBadgeClass(status: CertStatus): string {
  switch (status) {
    case 'active':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'expired':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'revoked':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-3 py-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            'mt-0.5 text-sm font-medium text-foreground break-words',
            mono && 'font-mono text-xs'
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function formatDate(value: Date | string): string {
  return dayjs(value).format('DD.MM.YYYY');
}

function daysUntilExpiry(validTo: Date | string): number {
  return dayjs(validTo).startOf('day').diff(dayjs().startOf('day'), 'day');
}

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
    open
  );
  const { mutateAsync: updateEmployee, isPending: isUpdatingEmployee } =
    useUpdateCertificateEmployee();

  const [editingBinding, setEditingBinding] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [unassignConfirm, setUnassignConfirm] = useState(false);

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
          : 'Сертификат привязан к сотруднику'
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

  const daysLeft = data ? daysUntilExpiry(data.validTo) : null;
  const documentsCount = data?.documents?.length ?? 0;
  const bindingBusy = isUpdatingEmployee;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
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
                  statusBadgeClass(data.status)
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

        {!isPending && data && (
          <div className="space-y-2">
            <section className="rounded-xl border border-border/70 bg-accent/30 p-4">
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
                        <p className="text-sm text-muted-foreground">
                        {data.employee.email}
                      </p>
                      </div>
                      
                      {(data.employee.department || data.employee.adUsername) && (
                        <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
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
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-dashed border-border bg-background/60 px-3 py-3">
                      <UserX className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Не привязан к сотруднику
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Сертификат загружен без связи с записью сотрудника в
                          системе
                        </p>
                      </div>
                    </div>
                  )}

                  {unassignConfirm && data.employee ? (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50/80 px-3 py-3">
                      <p className="text-sm text-foreground">
                        Отвязать сертификат от{' '}
                        <span className="font-medium">
                          {data.employee.fullName}
                        </span>
                        ?
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
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
                    <div className="mt-4 flex flex-wrap gap-2">
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

            <Separator />

            <section>
              <h3 className="mb-1 text-sm font-semibold text-foreground">
                Данные сертификата
              </h3>
              <div className="divide-y divide-border/60">
                <DetailRow icon={Hash} label="Серийный номер" value={data.serialNumber} mono />
                {data.thumbprint && (
                  <DetailRow
                    icon={Fingerprint}
                    label="Отпечаток"
                    value={data.thumbprint}
                    mono
                  />
                )}
                {data.issuer && (
                  <DetailRow icon={Building2} label="Издатель" value={data.issuer} />
                )}
                <DetailRow
                  icon={Calendar}
                  label="Период действия"
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
                                : 'text-muted-foreground'
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
                  <DetailRow icon={Mail} label="Email в сертификате" value={data.subjectEmail} />
                )}
              </div>
            </section>

            <Separator />

            <section>
              <h3 className="mb-1 text-sm font-semibold text-foreground">Дополнительно</h3>
              <div className="divide-y divide-border/60">
                <DetailRow icon={User} label="Кто загрузил" value={data.uploadedBy} />
                <DetailRow
                  icon={Calendar}
                  label="Дата загрузки"
                  value={dayjs(data.uploadedAt).format('DD.MM.YYYY HH:mm')}
                />
                <DetailRow
                  icon={FileBadge2}
                  label="Связанные документы"
                  value={
                    documentsCount === 0
                      ? 'Нет прикреплённых документов'
                      : `${documentsCount} ${documentsCount === 1 ? 'документ' : documentsCount < 5 ? 'документа' : 'документов'}`
                  }
                />
                {data.notes && (
                  <DetailRow icon={FileBadge2} label="Примечание" value={data.notes} />
                )}
              </div>
            </section>
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

        <DialogFooter>
          <DialogClose
            render={
              <Button
                variant="outline"
                className="cursor-pointer"
                disabled={isPending || bindingBusy}
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
