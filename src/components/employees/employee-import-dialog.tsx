'use client';

import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { showActionError, showActionSuccess } from '@/lib/toast-messages';
import { importEmployeesAction } from '@/server/actions/employee/import-employees-action';

type EmployeeImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
};

export function EmployeeImportDialog({
  open,
  onOpenChange,
  onImported,
}: EmployeeImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = async (file: File) => {
    setImporting(true);
    try {
      const content = await file.text();
      const result = await importEmployeesAction(content);

      if (!result.success || !result.data) {
        showActionError(result, 'Импорт сотрудников');
        return;
      }

      const { createdCount, skippedCount, errors } = result.data;
      showActionSuccess(
        'Импорт завершён',
        `Создано: ${createdCount}${skippedCount > 0 ? ` · пропущено: ${skippedCount}` : ''}${
          errors.length > 0 ? ` · ошибок: ${errors.length}` : ''
        }`,
      );

      onImported?.();
      onOpenChange(false);
    } catch (error) {
      showActionError(error, 'Импорт сотрудников');
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Импорт сотрудников из CSV</DialogTitle>
          <DialogDescription>
            Поддерживаются колонки: ФИО, email, логин AD, отдел, должность.
            Разделитель — запятая или точка с запятой.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center">
          <FileSpreadsheet className="mx-auto size-8 text-amber-700" />
          <p className="mt-3 text-sm text-muted-foreground">
            Выберите файл .csv с заголовками в первой строке
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Button
            type="button"
            className="mt-4 cursor-pointer gap-2"
            disabled={importing}
            onClick={() => inputRef.current?.click()}
          >
            {importing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Выбрать файл
          </Button>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importing}
          >
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
