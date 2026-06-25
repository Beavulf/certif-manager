'use client';

import { AlertCircle, Check, Loader2, Search } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSearchEmployeeInAD } from '@/hooks/use-employee';
import { showActionError, showValidationError } from '@/lib/toast-messages';
import { cn } from '@/lib/utils';
import type { EmployeeADSearchItem } from '@/server/actions/employee/search-employee-ad-action';
import type { SafeResult } from '@/types/safe-result-types';

type EmployeeAdSearchPanelProps = {
  onSelect: (item: EmployeeADSearchItem) => void;
  disabled?: boolean;
  selectedAdUsername?: string | null;
};

function isFailedResult(error: unknown): error is SafeResult {
  return (
    typeof error === 'object' &&
    error !== null &&
    'success' in error &&
    (error as SafeResult).success === false
  );
}

export function EmployeeAdSearchPanel({
  onSelect,
  disabled = false,
  selectedAdUsername,
}: EmployeeAdSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EmployeeADSearchItem[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const { mutateAsync: search, isPending } = useSearchEmployeeInAD();

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      showValidationError('Введите минимум 2 символа', 'ФИО или логин AD');
      return;
    }

    setNotFound(false);
    setResults(null);

    try {
      const data = await search(trimmed);
      if (!data) {
        setNotFound(true);
        return;
      }
      setResults(data);

      const available = data.filter((item) => !item.alreadyExists);
      if (available.length === 1) {
        onSelect(available[0]);
      }
    } catch (error) {
      if (isFailedResult(error) && error.code === 'NOT_FOUND') {
        setNotFound(true);
        return;
      }
      showActionError(error, 'Поиск в Active Directory');
    }
  }, [query, search, onSelect]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleSearch();
    }
  };

  const handlePick = (item: EmployeeADSearchItem) => {
    if (item.alreadyExists) {
      showValidationError('Сотрудник уже добавлен', item.fullName);
      return;
    }
    onSelect(item);
  };

  const showResultsList =
    results &&
    results.length > 0 &&
    (results.length > 1 ||
      results.every((item) => item.alreadyExists) ||
      !selectedAdUsername);

  return (
    <div className="space-y-2 rounded-lg border border-sky-200/70 bg-sky-50/40 p-3">
      <p className="text-xs font-medium text-foreground">Поиск в Active Directory</p>

      <div className="flex gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ФИО или логин"
            className="h-8 bg-white pl-8 text-sm"
            disabled={disabled || isPending}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 cursor-pointer border-sky-200/80 bg-white px-3 text-xs hover:bg-sky-50"
          onClick={() => void handleSearch()}
          disabled={disabled || isPending || query.trim().length < 2}
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            'Найти'
          )}
        </Button>
      </div>

      {notFound && (
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-800">
          <AlertCircle className="mt-px size-3 shrink-0" />
          Не найден в AD — заполните поля вручную
        </p>
      )}

      {showResultsList && (
        <ul className="max-h-28 space-y-1 overflow-y-auto">
          {results.length > 1 && (
            <p className="pb-0.5 text-[11px] text-muted-foreground">
              {results.length} совпадений
            </p>
          )}
          {results.map((item) => {
            const isSelected = selectedAdUsername === item.adUsername;
            const isTaken = item.alreadyExists;

            return (
              <li key={item.distinguishedName}>
                <button
                  type="button"
                  onClick={() => handlePick(item)}
                  disabled={disabled || isTaken}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors',
                    isSelected
                      ? 'border-emerald-300 bg-emerald-50/90'
                      : 'border-border/60 bg-white hover:border-sky-200 hover:bg-sky-50/50',
                    isTaken && 'cursor-not-allowed opacity-55',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{item.fullName}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.adUsername}
                      {item.department ? ` · ${item.department}` : ''}
                    </p>
                  </div>
                  {isTaken ? (
                    <span className="shrink-0 text-[10px] text-muted-foreground">В системе</span>
                  ) : isSelected ? (
                    <Check className="size-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <span className="shrink-0 text-[10px] font-medium text-sky-700">→</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
