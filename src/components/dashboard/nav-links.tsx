'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

import { dashboardLinks } from '@/constants/nav-links';

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {dashboardLinks.map((link) => {
        const Icon = link.icon;

        const isActive =
          link.href === '/'
            ? pathname === '/'
            : pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              'group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out',
              'hover:translate-x-[2px]',
              isActive
                ? 'border-amber-200 bg-amber-50 text-amber-800 shadow-sm'
                : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon
              className={clsx(
                'size-4 shrink-0 transition-colors',
                isActive
                  ? 'text-amber-700'
                  : 'text-muted-foreground group-hover:text-foreground'
              )}
            />
            <span>{link.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}