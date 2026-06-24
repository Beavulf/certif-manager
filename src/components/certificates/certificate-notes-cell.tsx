'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { showActionError, showActionSuccess } from '@/lib/toast-messages';
import { Input } from '@/components/ui/input';
import { useUpdateCertificateNotes } from '@/hooks/use-certificate';
import { cn } from '@/lib/utils';

type CertificateNotesCellProps = {
  certificateId: string;
  value: string | null;
  className?: string;
};

export function CertificateNotesCell({
  certificateId,
  value,
  className,
}: CertificateNotesCellProps) {
  const [draft, setDraft] = useState(value ?? '');
  const { mutateAsync, isPending } = useUpdateCertificateNotes();

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  const save = async () => {
    const next = draft.trim();
    const current = (value ?? '').trim();
    if (next === current) return;

    try {
      await mutateAsync({
        certificateId,
        notes: next || null,
      });
      showActionSuccess('Примечание сохранено');
    } catch (error) {
      showActionError(error, 'Сохранение примечания в таблице', 'Не удалось сохранить примечание');
      setDraft(value ?? '');
    }
  };

  return (
    <div className={cn('relative min-w-[140px]', className)}>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        disabled={isPending}
        placeholder="Добавить…"
        maxLength={255}
        className="h-8 border-border/60 bg-background/80 px-2.5 text-xs"
      />
      {isPending && (
        <Loader2 className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
