'use client';

import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

/** Кнопка «Повторить» для error-состояний серверных страниц (router.refresh). */
export function RetryButton({ label = 'Повторить' }: { label?: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleRetry = () => {
    setIsPending(true);
    router.refresh();
    // router.refresh() не сигналит о завершении — показываем спиннер фиксированно.
    setTimeout(() => setIsPending(false), 800);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleRetry}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      {label}
    </Button>
  );
}
