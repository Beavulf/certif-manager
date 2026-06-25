import "./globals.css";
import { Providers } from "./providers";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Toaster } from "sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Менеджер сертификатов',
  description: 'Учёт сертификатов сотрудников, сроков действия и уведомлений',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={cn("font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}<Toaster/></Providers>
      </body>
    </html>
  );
}
