'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SHORTCUTS = [
  { keys: '/', description: 'Фокус на поле поиска текущей страницы' },
  { keys: '?', description: 'Показать список горячих клавиш' },
  { keys: 'Esc', description: 'Закрыть открытый диалог' },
];

export function KeyboardShortcutsProvider() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      const isTyping =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable;

      if (event.key === '?' && !isTyping && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey) {
        const search = document.querySelector<HTMLInputElement>(
          '[data-page-search-input]',
        );
        if (search) {
          event.preventDefault();
          search.focus();
          search.select();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Горячие клавиши</DialogTitle>
          </DialogHeader>
          <ul className="space-y-3">
            {SHORTCUTS.map((item) => (
              <li
                key={item.keys}
                className="flex items-center justify-between gap-4 rounded-lg border border-border/70 px-3 py-2"
              >
                <span className="text-sm text-muted-foreground">{item.description}</span>
                <kbd className="rounded-md border border-border bg-muted px-2 py-1 text-xs font-semibold">
                  {item.keys}
                </kbd>
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
