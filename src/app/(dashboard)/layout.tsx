
import { AppSidebar } from '@/components/dashboard/app-sidebar';
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
      <div className="grid min-h-screen grid-cols-[260px_1fr]">
        <AppSidebar username={user.username} />
        <SessionWatcher expiresAt={user.exp} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}