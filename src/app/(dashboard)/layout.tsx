import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { KeyboardShortcutsProvider } from '@/components/dashboard/keyboard-shortcuts';
import { MobileNav } from '@/components/dashboard/mobile-nav';
import { requireAuth } from '@/lib/session-helper';
import { SessionWatcher } from '@/components/dashboard/session-watcher';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <AppSidebar username={user.username} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <MobileNav username={user.username} />
          <SessionWatcher expiresAt={user.exp} />
          <KeyboardShortcutsProvider />
          {children}
        </div>
      </div>
    </div>
  );
}