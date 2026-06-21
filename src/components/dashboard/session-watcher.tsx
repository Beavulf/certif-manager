'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {toast} from 'sonner';


type SessionWatcherProps = {
  expiresAt: number;
};

export function SessionWatcher({ expiresAt }: SessionWatcherProps) {
  const router = useRouter();

  useEffect(() => {
    const timeout = expiresAt * 1000 - Date.now();
    
    if (timeout <= 15 * 60 * 1000 || timeout <= 5 * 60 * 1000) {
      toast.warning(
        `До конца сессии осталось: ${(timeout / 1000 / 60).toFixed(0)} минут`,
        {
          duration: timeout,
          action: {
            label: 'Закрыть',
            onClick: () => toast.dismiss(),
          },
          style:{color:'orange'}
        }
      )
 
    }

    if (timeout <= 0) {
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