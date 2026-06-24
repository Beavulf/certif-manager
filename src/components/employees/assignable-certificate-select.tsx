'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, FileBadge2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAssignableCertificates } from '@/hooks/use-assignable-certificates';
import dayjs from '@/lib/dayjs-config';
import { STATUS_LABELS } from '@/lib/certificate-expiry';
import type { CertStatus } from '@/generated/prisma/client';
import { cn } from '@/lib/utils';

type AssignableCertificateSelectProps = {
  employeeId: string;
  value: string;
  onValueChange: (certificateId: string) => void;
  disabled?: boolean;
  className?: string;
};

function certSubtitle(serialNumber: string, validTo: Date, status: CertStatus) {
  return `${serialNumber} · до ${dayjs(validTo).format('DD.MM.YYYY')} · ${STATUS_LABELS[status]}`;
}

export function AssignableCertificateSelect({
  employeeId,
  value,
  onValueChange,
  disabled = false,
  className,
}: AssignableCertificateSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { data: certificates = [], isLoading, isError } =
    useAssignableCertificates(employeeId, true);

  const selected = useMemo(
    () => certificates.find((cert) => cert.id === value),
    [certificates, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return certificates;
    return certificates.filter((cert) => {
      const haystack = [cert.subjectCN, cert.serialNumber]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [certificates, query]);

  function selectCertificate(certificateId: string) {
    onValueChange(certificateId);
    setOpen(false);
    setQuery('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={(triggerProps) => (
          <Button
            {...triggerProps}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'h-11 w-full justify-between font-normal',
              !value && 'text-muted-foreground',
              className,
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <FileBadge2 className="size-4 shrink-0 opacity-70" />
              <span className="truncate">
                {selected
                  ? `${selected.serialNumber} · ${dayjs(selected.validTo).format('DD.MM.YYYY')}`
                  : 'Выберите сертификат'}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        )}
      />

      <PopoverContent className="w-(--anchor-width) min-w-[340px] p-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по серийнику…"
          className="h-10"
          autoFocus
        />

        <div className="mt-3 max-h-64 overflow-auto rounded-md border border-border/70">
          <div className="p-1">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Загрузка…
              </div>
            ) : isError ? (
              <div className="py-8 text-center text-sm text-destructive">
                Не удалось загрузить список
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {certificates.length === 0
                  ? 'Нет свободных сертификатов с совпадающим ФИО'
                  : 'Ничего не найдено'}
              </div>
            ) : (
              filtered.map((cert) => {
                const isSelected = value === cert.id;
                return (
                  <button
                    key={cert.id}
                    type="button"
                    onClick={() => selectCertificate(cert.id)}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent/50',
                      isSelected && 'bg-accent/50',
                    )}
                  >
                    <Check
                      className={cn(
                        'mt-0.5 size-4 shrink-0',
                        isSelected ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium leading-snug">
                        {cert.subjectCN}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {certSubtitle(cert.serialNumber, cert.validTo, cert.status)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
