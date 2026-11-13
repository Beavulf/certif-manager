import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { KeyboardShortcutsProvider } from '@/components/dashboard/keyboard-shortcuts';
import { MobileNav } from '@/components/dashboard/mobile-nav';
import { requireAuth } from '@/lib/session-helper';
import { SessionWatcher } from '@/components/dashboard/session-watcher';
import { appSettingsService } from '@/server/services/app-settings-service';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, appSettings] = await Promise.all([
    requireAuth(),
    // Настройки могут быть недоступны (например, первый запуск без БД) —
    // шапка в этом случае просто показывает дефолтные названия.
    appSettingsService
      .getOrCreate()
      .catch(() => ({ appName: null, organizationName: null })),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <AppSidebar
          username={user.username}
          appName={appSettings.appName}
          organizationName={appSettings.organizationName}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <MobileNav
            username={user.username}
            appName={appSettings.appName}
          />
          <SessionWatcher expiresAt={user.exp} />
          <KeyboardShortcutsProvider />
          {children}
        </div>
      </div>
    </div>
  );
}