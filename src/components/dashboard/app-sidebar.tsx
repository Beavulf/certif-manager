import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

import { NavLinks } from '@/components/dashboard/nav-links';
import { LogOut } from 'lucide-react';
import { logout } from '@/server/actions/graphql-action';

type AppSidebarProps = {
  username: string;
};

export function AppSidebar({ username }: AppSidebarProps) {
  return (
    <aside className="hidden border-r border-border/80 bg-[#fffdf9] lg:flex lg:w-[260px] lg:flex-col">
      <div className="border-b border-border/70 px-5 py-5" style={{height:'85px'}}>
        <Link href="/" className="group block">
          <div className="flex items-center gap-3" >
            <div className="flex size-10 items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50 text-amber-700 shadow-sm">
              <ShieldCheck className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-wide text-foreground">
                Certif Manager
              </p>
              <p className="text-xs text-muted-foreground">
                Certificate workspace
              </p>
            </div>
          </div>
        </Link>
      </div>

      <div className="flex-1 px-3 py-4">
        <div className="mb-3 px-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            Навигация
          </p>
        </div>

        <NavLinks />
      </div>

      <div className="border-t border-border/70 p-4">
        <div className="rounded-2xl border border-border/70 bg-background px-4 py-3 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Вы вошли как</p>
            <p className="mt-1 truncate text-sm font-medium text-foreground">
              {username}
            </p>
          </div>
          <form 
            action={logout} 
            className="ml-3"
            style={{ margin: 0, display: 'flex' }}
          >
            <button
              type="submit"
              className="flex items-center justify-center rounded-lg p-1.5 hover:bg-muted transition cursor-pointer"
              title="Выйти"
            >
              <LogOut size={14}/>
            </button>
          </form>
        </div>
      </div>
 
 
    </aside>
  );
}