'use client';

import { Link2, UserX } from 'lucide-react';

import { Button } from '@/components/ui/button';

type EmployeeBulkActionsProps = {
  selectedCount: number;
  busy?: boolean;
  onDeactivate: () => void;
  onAssignCertificates: () => void;
  onClearSelection: () => void;
};

export function EmployeeBulkActions({
  selectedCount,
  busy = false,
  onDeactivate,
  onAssignCertificates,
  onClearSelection,
}: EmployeeBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200/70 bg-amber-50/50 px-3 py-2">
      <span className="text-sm text-foreground">
        Выбрано: <span className="font-semibold">{selectedCount}</span>
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="cursor-pointer gap-1.5"
        disabled={busy}
        onClick={onAssignCertificates}
      >
        <Link2 className="size-3.5" />
        Привязать сертификаты
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="cursor-pointer gap-1.5"
        disabled={busy}
        onClick={onDeactivate}
      >
        <UserX className="size-3.5" />
        Деактивировать
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="cursor-pointer"
        disabled={busy}
        onClick={onClearSelection}
      >
        Снять выбор
      </Button>
    </div>
  );
}
