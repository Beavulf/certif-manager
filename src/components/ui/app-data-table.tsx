'use client';

import { ConfigProvider } from 'antd';
import type { RefObject, ReactNode } from 'react';

import { APP_TABLE_THEME } from '@/lib/ant-table-config';
import { cn } from '@/lib/utils';

type AppDataTableProviderProps = {
  children: ReactNode;
};

export function AppDataTableProvider({ children }: AppDataTableProviderProps) {
  return <ConfigProvider theme={APP_TABLE_THEME}>{children}</ConfigProvider>;
}

type AppDataTableShellProps = {
  children: ReactNode;
  className?: string;
  containerRef?: RefObject<HTMLDivElement | null>;
};

export function AppDataTableShell({
  children,
  className,
  containerRef,
}: AppDataTableShellProps) {
  return (
    <div
      ref={containerRef}
      className={cn(
        'app-data-table flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  );
}
