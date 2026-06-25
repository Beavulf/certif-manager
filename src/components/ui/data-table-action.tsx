'use client';

import { Tooltip } from 'antd';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type DataTableActionProps = {
  icon: LucideIcon;
  label: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDoubleClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
};

export function DataTableAction({
  icon: Icon,
  label,
  onClick,
  onDoubleClick,
  disabled = false,
  variant = 'default',
}: DataTableActionProps) {
  return (
    <Tooltip title={label}>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className={cn(
          'app-data-table-action inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors',
          variant === 'danger'
            ? 'hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50'
            : 'hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <Icon className="size-4" />
      </button>
    </Tooltip>
  );
}
