'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { showActionSuccess, showValidationError } from '@/lib/toast-messages';
import { cn } from '@/lib/utils';

/**
 * Clipboard API доступен только в secure context (HTTPS / localhost).
 * Приложение открывается по http://<ip-сервера>:3003, поэтому при недоступности
 * API откатываемся к execCommand через временную textarea — он работает и по HTTP.
 */
function copyViaExecCommand(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  // Не display:none — скрытый элемент нельзя выделить в части браузеров.
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    document.body.removeChild(textarea);
  }
  return copied;
}

export async function copyTextToClipboard(text: string, label = 'Скопировано в буфер обмена') {
  if (!navigator.clipboard) {
    if (!copyViaExecCommand(text)) {
      throw new Error('Clipboard is unavailable');
    }
    showActionSuccess(label);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    if (!copyViaExecCommand(text)) {
      throw new Error('Clipboard is unavailable');
    }
  }
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
