'use client';

import Link from 'next/link';
import { Menu, ShieldCheck, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { dashboardLinks } from '@/constants/nav-links';
import { cn } from '@/lib/utils';
import { logout } from '@/server/services/graphql-service';

type MobileNavProps = {
  username: string;
};

export function MobileNav({ username }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="border-b border-border/70 bg-[#fffdf9] px-4 py-3 lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl border border-amber-200/80 bg-amber-50 text-amber-700">
            <ShieldCheck className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Менеджер сертификатов</p>
            <p className="truncate text-[11px] text-muted-foreground">{username}</p>
          </div>
        </Link>

        <Button
            type="button"
            variant="outline"
            size="icon"
            className="cursor-pointer"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
      </div>

      {open ? (
        <nav className="mt-3 space-y-1 rounded-xl border border-border/70 bg-background p-2">
          {dashboardLinks.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-amber-50 text-amber-900'
                    : 'text-foreground hover:bg-accent',
                )}
              >
                <link.icon className="size-4" />
                {link.title}
              </Link>
            );
          })}
          <form action={logout} className="border-t border-border/70 pt-2">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-accent"
            >
              Выйти
            </button>
          </form>
        </nav>
      ) : null}
    </div>
  );
}
