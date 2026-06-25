'use client';

import { FileSpreadsheet, Plus, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';

type EmployeesEmptyStateProps = {
  onCreate: () => void;
  onImport: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
};

export function EmployeesEmptyState({
  onCreate,
  onImport,
  onRefresh,
  refreshing = false,
}: EmployeesEmptyStateProps) {
  return (
    <div className="px-6 py-14">
      <div className="rounded-2xl border border-dashed border-border bg-accent/40 px-6 py-12 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
          <UserRound className="size-6" />
        </div>

        <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
          Сотрудники пока не добавлены
        </h2>

        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Найдите человека в Active Directory, импортируйте список из CSV или
          создайте запись вручную — затем привяжите к нему сертификаты.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button type="button" className="cursor-pointer gap-2" onClick={onCreate}>
            <Plus className="size-4" />
            Добавить из AD
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer gap-2"
            onClick={onImport}
          >
            <FileSpreadsheet className="size-4" />
            Импорт CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            className="cursor-pointer"
            disabled={refreshing}
          >
            Обновить список
          </Button>
        </div>
      </div>
    </div>
  );
}
