import "./globals.css";
import { Providers } from "./providers";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ensureBackgroundJobsStarted } from "@/lib/start-background-jobs";
import type { Metadata } from "next";
import { Toaster } from "sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

// Название системы задаётся в «Настройках» (appName) и должно применяться
// в заголовке вкладки браузера. DB может быть недоступна — откатываемся к дефолту.
export async function generateMetadata(): Promise<Metadata> {
  let title = 'Менеджер сертификатов';
  try {
    const { appSettingsService } = await import(
      '@/server/services/app-settings-service'
    );
    const settings = await appSettingsService.getOrCreate();
    title = settings.appName?.trim() || title;
  } catch {
    // Настройки недоступны (нет БД при первом запуске) — используем дефолт.
  }

  return {
    title,
    description: 'Учёт сертификатов сотрудников, сроков действия и уведомлений',
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fallback when instrumentation is skipped (Next.js 16 standalone).
  // Fire-and-forget so the first request still bootstraps cron.
  void ensureBackgroundJobsStarted().catch((error) => {
    console.error('[BOOT] Failed to start background jobs from layout:', error);
  });

  return (
    <html lang="ru" className={cn("font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}<Toaster/></Providers>
      </body>
    </html>
  );
}
