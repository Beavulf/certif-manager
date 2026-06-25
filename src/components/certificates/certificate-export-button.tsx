'use client';

import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadCertificatesCsv } from '@/lib/certificate-export';
import { getPresetLabel, type CertificatePresetId } from '@/lib/certificate-presets';
import type { ExpiryThresholds } from '@/lib/certificate-expiry';
import { showActionError, showActionSuccess } from '@/lib/toast-messages';
import { logCertificatesExportAction } from '@/server/actions/certificate/log-certificates-export-action';
import type { CertificatesWithIncludes } from '@/types/certificate-types';

type CertificateExportButtonProps = {
  data: CertificatesWithIncludes[];
  selectedIds: string[];
  activePreset: CertificatePresetId | null;
  expiryThresholds: ExpiryThresholds;
  disabled?: boolean;
};

export function CertificateExportButton({
  data,
  selectedIds,
  activePreset,
  expiryThresholds,
  disabled = false,
}: CertificateExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const exportRows = (rows: CertificatesWithIncludes[], selectedOnly: boolean) => {
    if (rows.length === 0) return;

    setExporting(true);
    try {
      downloadCertificatesCsv(rows, expiryThresholds);
      void logCertificatesExportAction({
        count: rows.length,
        preset: activePreset ? getPresetLabel(activePreset) : undefined,
        selectedOnly,
      }).then((result) => {
        if (!result.success) {
          showActionError(result, 'Экспорт', 'Файл сохранён, но запись в аудит не создана');
        }
      });

      showActionSuccess(
        'Экспорт завершён',
        `Сохранено записей: ${rows.length}`,
      );
    } catch (error) {
      showActionError(error, 'Экспорт', 'Не удалось сформировать CSV-файл');
    } finally {
      setExporting(false);
    }
  };

  const selectedRows = data.filter((row) => selectedIds.includes(row.id));
  const hasSelection = selectedRows.length > 0;

  if (!hasSelection) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-11 cursor-pointer gap-2"
        disabled={disabled || exporting || data.length === 0}
        onClick={() => exportRows(data, false)}
      >
        {exporting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        Экспорт CSV
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="h-11 cursor-pointer gap-2"
            disabled={disabled || exporting}
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Экспорт
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => exportRows(selectedRows, true)}>
          Выбранные ({selectedRows.length})
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportRows(data, false)}>
          Текущая выборка ({data.length})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
