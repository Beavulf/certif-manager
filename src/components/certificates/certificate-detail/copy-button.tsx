'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { showActionSuccess, showValidationError } from '@/lib/toast-messages';
import { cn } from '@/lib/utils';

export async function copyTextToClipboard(text: string, label = 'Скопировано в буфер обмена') {
  await navigator.clipboard.writeText(text);
  showActionSuccess(label);
}

type CopyButtonProps = {
  value: string;
  label?: string;
  className?: string;
};

export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(value, label ?? 'Скопировано');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      showValidationError(
        'Не удалось скопировать',
        'Браузер заблокировал доступ к буферу обмена',
      );
    }
  };

  return (
    <button
      type="button"
      aria-label={label ?? 'Копировать'}
      onClick={handleCopy}
      className={cn(
        'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
    </button>
  );
}
