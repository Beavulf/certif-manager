'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';


type SessionWatcherProps = {
  expiresAt: number;
};

export function SessionWatcher({ expiresAt }: SessionWatcherProps) {
  const router = useRouter();

  useEffect(() => {
    const timeout = expiresAt * 1000 - Date.now();
    
    const minutesLeft = Math.max(1, Math.ceil(timeout / 1000 / 60));

    if (timeout <= 15 * 60 * 1000) {
      toast.warning(
        `Сессия истекает через ${minutesLeft} мин.`,
        {
          description: 'Сохраните изменения и войдите снова, чтобы продолжить работу',
          duration: Math.min(timeout, 60_000),
          action: {
            label: 'Закрыть',
            onClick: () => toast.dismiss(),
          },
        },
      );
    }

    if (timeout <= 0) {
      toast.error('Сессия завершена', {
        description: 'Выполнен переход на страницу входа',
      });
      router.replace('/login');
      router.refresh();
      return;
    }

    const id = window.setTimeout(() => {
      router.replace('/login');
      router.refresh();
    }, timeout);

    return () => window.clearTimeout(id);
  }, [expiresAt, router]);

  return null;
}