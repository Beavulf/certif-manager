'use client';

import { BellRing, Loader2, Upload, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { UploadDialog } from '@/components/certificates/upload-dialog/upload-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRunNotificationCheck } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

type DashboardQuickActionsProps = {
  notificationsEnabled: boolean;
  className?: string;
};

export function DashboardQuickActions({
  notificationsEnabled,
  className,
}: DashboardQuickActionsProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const runCheck = useRunNotificationCheck();

  return (
    <Card className={cn('border-border/70 shadow-sm', className)}>
      <CardContent className="flex flex-wrap items-center gap-2 p-4">
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Быстрые действия
        </span>

        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          hideTrigger
        />
        <Button
          type="button"
          className="cursor-pointer gap-2"
          onClick={() => setUploadOpen(true)}
        >
          <Upload className="size-4" />
          Загрузить сертификат
        </Button>

        <Button
          type="button"
          variant="outline"
          className="cursor-pointer gap-2"
          disabled={!notificationsEnabled || runCheck.isPending}
          title={
            notificationsEnabled
              ? 'Запустить проверку сроков и отправку напоминаний'
              : 'Уведомления отключены в настройках'
          }
          onClick={() => runCheck.mutate({})}
        >
          {runCheck.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <BellRing className="size-4" />
          )}
          Проверить уведомления
        </Button>

        <Button
          asChild
          variant="outline"
          className="cursor-pointer gap-2"
        >
          <Link href="/employees?action=create">
            <UserPlus className="size-4" />
            Добавить сотрудника
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
