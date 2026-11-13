'use client';

import { Loader2, ShieldBan } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useRevokeExpiredCertificates } from '@/hooks/use-certificate';
import dayjs from '@/lib/dayjs-config';
import { daysUntilExpiry } from '@/lib/certificate-expiry';
import { showActionError, showActionSuccess } from '@/lib/toast-messages';
import type { CertificatesWithIncludes } from '@/types/certificate-types';
import { cn } from '@/lib/utils';

type RevokeExpiredCertificatesButtonProps = {
  /** Полный список сертификатов — для мгновенного превью на клиенте. */
  certificates: CertificatesWithIncludes[];
  disabled?: boolean;
  className?: string;
};

const DEFAULT_DAYS = 5;
const MIN_DAYS = 1;
const MAX_DAYS = 365;

// Должно совпадать с cutoff в revokeExpiredCertificatesAction:
// аннулируются сертификаты, у которых дней до истечения ≤ −days.
function findRevocable(
  certificates: CertificatesWithIncludes[],
  days: number,
): CertificatesWithIncludes[] {
  return certificates
    .filter(
      (certificate) =>
        certificate.status !== 'revoked' &&
        daysUntilExpiry(certificate.validTo) <= -days,
    )
    .sort((a, b) => a.validTo.getTime() - b.validTo.getTime());
}

export function RevokeExpiredCertificatesButton({
  certificates,
  disabled = false,
  className,
}: RevokeExpiredCertificatesButtonProps) {
  const { mutateAsync, isPending } = useRevokeExpiredCertificates();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(`${DEFAULT_DAYS}`);

  const parsedDays = Number.parseInt(days, 10);
  const daysValid =
    Number.isInteger(parsedDays) && parsedDays >= MIN_DAYS && parsedDays <= MAX_DAYS;

  const affected = useMemo(
    () => (daysValid ? findRevocable(certificates, parsedDays) : []),
    [certificates, daysValid, parsedDays],
  );

  const defaultAffectedCount = useMemo(
    () => findRevocable(certificates, DEFAULT_DAYS).length,
    [certificates],
  );

  const handleConfirm = async () => {
    try {
      const report = await mutateAsync({ days: parsedDays });
      setOpen(false);

      if (!report || report.revokedCount === 0) {
        showActionSuccess('Ничего не аннулировано', 'Подходящих сертификатов не нашлось');
        return;
      }

      showActionSuccess(
        `Аннулировано сертификатов: ${report.revokedCount}`,
        'Они перемещены в фильтр «Отозваны» и больше не попадут в активные списки и уведомления',
      );
    } catch (error) {
      showActionError(error, 'Аннулирование истёкших сертификатов');
    }
  };

  const busy = isPending || disabled;

  return (
    <>
      <span className={cn('inline-flex', className)}>
        <Button
          type="button"
          variant="outline"
          className="h-11 cursor-pointer gap-2"
          disabled={busy}
          onClick={() => {
            setDays(`${DEFAULT_DAYS}`);
            setOpen(true);
          }}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShieldBan className="size-4 shrink-0" />
          )}
          Аннулировать истёкшие
          {defaultAffectedCount > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
              {defaultAffectedCount}
            </span>
          ) : null}
        </Button>
      </span>

      <Dialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
        <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="border-b border-border/70 px-6 py-4 text-left">
            <DialogTitle>Аннулировать истёкшие сертификаты</DialogTitle>
            <DialogDescription>
              Переводит истёкшие сертификаты в статус «Отозван» — они убираются
              из рабочих списков.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="revoke-expired-days"
                className="whitespace-nowrap text-sm text-muted-foreground"
              >
                Истёкших не менее (дней назад):
              </label>
              <Input
                id="revoke-expired-days"
                type="number"
                min={MIN_DAYS}
                max={MAX_DAYS}
                value={days}
                onChange={(event) => setDays(event.target.value)}
                className="h-9 w-24"
              />
              <div className="flex gap-1.5">
                {[3, 5, 14, 30].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      'h-8 cursor-pointer px-2.5 text-xs',
                      daysValid && parsedDays === preset && 'border-amber-300 bg-amber-50 text-amber-900',
                    )}
                    onClick={() => setDays(`${preset}`)}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>

            {daysValid ? (
              affected.length > 0 ? (
                <section>
                  <h3 className="text-sm font-semibold text-foreground">
                    Будет аннулировано: {affected.length}
                  </h3>
                  <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-border/70 bg-muted/15 p-3">
                    {affected.map((certificate) => {
                      const daysLeft = daysUntilExpiry(certificate.validTo);
                      return (
                        <li
                          key={certificate.id}
                          className="text-sm leading-snug text-foreground"
                        >
                          <span className="font-medium">{certificate.subjectCN}</span>
                          <span className="text-muted-foreground">
                            {' '}
                            · {certificate.serialNumber}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            Истёк {dayjs(certificate.validTo).format('DD.MM.YYYY')} (
                            {Math.abs(daysLeft)}{' '}
                            {daysLeft <= -5 ? 'дн.' : daysLeft <= -2 ? 'дня' : 'день'} назад)
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : (
                <p className="rounded-xl border border-border/70 bg-muted/15 px-4 py-6 text-center text-sm text-muted-foreground">
                  Подходящих сертификатов не нашлось — всё чисто.
                </p>
              )
            ) : (
              <p className="rounded-xl border border-amber-200/70 bg-amber-50/40 px-4 py-3 text-sm text-amber-900">
                Укажите количество дней от {MIN_DAYS} до {MAX_DAYS}.
              </p>
            )}
          </div>

          {/* mx-0/mb-0 гасят дефолтные отрицательные отступы DialogFooter:
              в диалоге с p-0 они прижимали кнопки к нижней границе окна. */}
          <DialogFooter className="mx-0 mb-0 rounded-b-xl border-t border-border/70 px-6 py-4 pb-5">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={isPending || !daysValid || affected.length === 0}
              onClick={handleConfirm}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Аннулировать{affected.length > 0 ? ` (${affected.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
