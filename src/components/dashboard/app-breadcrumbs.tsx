'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

import { cn } from '@/lib/utils';

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Обзор',
  '/certificates': 'Сертификаты',
  '/employees': 'Сотрудники',
  '/notifications': 'Уведомления',
  '/settings': 'Настройки',
};

export function AppBreadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const label = ROUTE_LABELS[pathname];

  if (!label || pathname === '/') {
    return null;
  }

  return (
    <nav
      aria-label="Хлебные крошки"
      className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}
    >
      <Link href="/" className="transition-colors hover:text-foreground">
        Обзор
      </Link>
      <span aria-hidden>/</span>
      <span className="font-medium text-foreground">{label}</span>
    </nav>
  );
}

export function AppBreadcrumbsInline() {
  const pathname = usePathname();

  if (pathname === '/') return null;

  return (
    <Fragment>
      <AppBreadcrumbs className="mb-2" />
    </Fragment>
  );
}
