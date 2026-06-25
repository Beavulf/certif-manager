'use client';

import { Check, Layers3 } from 'lucide-react';
import { Popconfirm } from 'antd';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CertificateGroupBy } from '@/lib/certificate-table-utils';
import { getPresetLabel, type CertificatePresetId } from '@/lib/certificate-presets';
import { cn } from '@/lib/utils';

const GROUP_OPTIONS: { value: CertificateGroupBy; label: string }[] = [
  { value: 'none', label: 'Без группировки' },
  { value: 'status', label: 'По статусу' },
  { value: 'issuer', label: 'По издателю' },
  { value: 'employee', label: 'По сотруднику' },
];

export function GroupBySelect({
  value,
  onValueChange,
  className,
}: {
  value: CertificateGroupBy;
  onValueChange: (value: CertificateGroupBy) => void;
  className?: string;
}) {
  const currentLabel =
    GROUP_OPTIONS.find((option) => option.value === value)?.label ??
    'Группировка';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              'h-11 gap-2',
              value !== 'none' && 'border-primary/40 bg-primary/5',
              className,
            )}
          >
            <Layers3 className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{currentLabel}</span>
          </Button>
        }
      />
      <DropdownMenuContent className="w-52">
        {GROUP_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onValueChange(option.value)}
            className="justify-between"
          >
            {option.label}
            {value === option.value ? (
              <Check className="size-4 text-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatRecordsCount(count: number): string {
  if (count === 1) return 'запись';
  if (count < 5) return 'записи';
  return 'записей';
}

export function CertificatesTableHeader({
  totalCount,
  totalInSystem,
  activePreset,
  selectedCount,
  deleting,
  onClearSelection,
  onBulkDelete,
}: {
  totalCount: number;
  totalInSystem?: number;
  activePreset?: CertificatePresetId | null;
  selectedCount: number;
  deleting?: boolean;
  onClearSelection: () => void;
  onBulkDelete: () => void;
}) {
  const showFilteredHint =
    activePreset && totalInSystem != null && totalCount !== totalInSystem;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          Список сертификатов
          {activePreset ? (
            <span className="ml-2 text-sm font-medium text-amber-800">
              · {getPresetLabel(activePreset)}
            </span>
          ) : null}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalCount} {formatRecordsCount(totalCount)}
          {showFilteredHint ? (
            <span> из {totalInSystem} в системе</span>
          ) : null}
          {selectedCount > 0 && (
            <span className="text-foreground">
              {' '}
              · выбрано{' '}
              <span className="font-medium text-primary">{selectedCount}</span>
            </span>
          )}
        </p>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={deleting}
            onClick={onClearSelection}
          >
            Снять выбор
          </Button>
          <Popconfirm
            title="Удалить выбранные сертификаты?"
            description={`Будет удалено ${selectedCount} записей без возможности восстановления.`}
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true, loading: deleting }}
            onConfirm={onBulkDelete}
            placement="topRight"
          >
            <span className="inline-flex">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="cursor-pointer"
                disabled={deleting}
              >
                Удалить выбранные
              </Button>
            </span>
          </Popconfirm>
        </div>
      )}
    </div>
  );
}
