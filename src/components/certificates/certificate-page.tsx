'use client';

import { FileBadge2, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useBulkDeleteCertificates,
  useDeleteCertificate,
  useGetCertificatesAll,
} from '@/hooks/use-certificate';
import {
  computeCertificateStats,
  type CertificateGroupBy,
} from '@/lib/certificate-table-utils';
import { DEFAULT_EXPIRY_THRESHOLDS } from '@/lib/certificate-expiry';
import {
  applyCertificatePreset,
  countByPreset,
  isCertificatePresetId,
  type CertificatePresetId,
} from '@/lib/certificate-presets';
import { showActionError, showActionSuccess } from '@/lib/toast-messages';
import { usePublicAppSettings } from '@/hooks/use-settings';
import type { Certificate } from '@/generated/prisma/client';
import type { SafeResult } from '@/types/safe-result-types';
import { CertificateFields } from '@/types/certificate-types';

import { CertificateDetailDialog } from './certificate-detail-dialog';
import { CertificateExportButton } from './certificate-export-button';
import { CertificatePresetFilters } from './certificate-preset-filters';
import { CertificatesStats } from './certificates-stats';
import { CertificatesTable } from './certificates-table';
import { CertificatesTableHeader, GroupBySelect } from './certificates-toolbar';
import { FilterSelect } from './filter-select';
import { UploadDialog } from './upload-dialog/upload-dialog';
import { TableSkeleton } from '@/components/ui/table-skeleton';

const FILTER_FIELDS = [
  { label: 'ФИО', value: CertificateFields.subjectCN },
  { label: 'Серийник', value: CertificateFields.serialNumber },
  { label: 'Email', value: CertificateFields.subjectEmail },
  { label: 'Действует с', value: CertificateFields.validFrom },
  { label: 'Истекает', value: CertificateFields.validTo },
  { label: 'Кто добавил', value: CertificateFields.uploadedBy },
  { label: 'Загружен', value: CertificateFields.uploadedAt },
  { label: 'Отпечаток', value: CertificateFields.thumbprint },
  { label: 'Издатель', value: CertificateFields.issuer },
  { label: 'Примечание', value: CertificateFields.notes },
  { label: 'Статус', value: CertificateFields.status },
];

export function CertificatesPage({
  initial,
}: {
  initial: SafeResult<Certificate[]>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetParam = searchParams.get('preset');
  const certIdParam = searchParams.get('id');
  const initialPreset = isCertificatePresetId(presetParam) ? presetParam : null;

  const [search, setSearch] = useState('');
  const initialData = initial.success ? initial.data : [];
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<CertificateGroupBy>('none');
  const [activePreset, setActivePreset] = useState<CertificatePresetId | null>(initialPreset);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [detailCertificateId, setDetailCertificateId] = useState<string | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const openCertificateDetail = (id: string) => {
    setDetailCertificateId(id);
    setDetailOpen(true);
  };

  const { data = [], isPending, error, refetch } = useGetCertificatesAll({
    filter: search,
    initialData,
    fields: selectedFields.length > 0 ? selectedFields : undefined,
  });

  const { mutateAsync, isPending: isDeleting } = useDeleteCertificate();
  const { mutateAsync: bulkDelete, isPending: isBulkDeleting } =
    useBulkDeleteCertificates();

  const { data: appSettings } = usePublicAppSettings();
  const expiryThresholds = appSettings
    ? { warningDays: appSettings.warningDays, criticalDays: appSettings.criticalDays }
    : DEFAULT_EXPIRY_THRESHOLDS;

  const presetCounts = useMemo(
    () => countByPreset(data, expiryThresholds),
    [data, expiryThresholds],
  );

  const filteredData = useMemo(
    () => applyCertificatePreset(data, activePreset, expiryThresholds),
    [data, activePreset, expiryThresholds],
  );

  const stats = useMemo(
    () => computeCertificateStats(filteredData, expiryThresholds),
    [filteredData, expiryThresholds],
  );

  const updatePreset = useCallback(
    (preset: CertificatePresetId | null) => {
      setActivePreset(preset);
      setSelectedRowKeys([]);

      const params = new URLSearchParams(searchParams.toString());
      if (preset) {
        params.set('preset', preset);
      } else {
        params.delete('preset');
      }

      const query = params.toString();
      router.replace(query ? `/certificates?${query}` : '/certificates', {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (isCertificatePresetId(presetParam)) {
      setActivePreset(presetParam);
    } else if (!presetParam) {
      setActivePreset(null);
    }
  }, [presetParam]);

  useEffect(() => {
    if (certIdParam) {
      openCertificateDetail(certIdParam);
    }
  }, [certIdParam]);

  const handleDeleteCertificate = async (id: string) => {
    try {
      const deleted = await mutateAsync(id);
      showActionSuccess(
        'Сертификат удалён',
        deleted
          ? `${deleted.subjectCN} · серийный номер ${deleted.serialNumber}`
          : undefined,
      );
      setSelectedRowKeys((prev) => prev.filter((key) => key !== id));
    } catch (err) {
      showActionError(err, 'Удаление сертификата', 'Не удалось удалить сертификат');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const result = await bulkDelete(selectedRowKeys);
      if (!result) return;

      showActionSuccess(
        'Массовое удаление завершено',
        `Удалено сертификатов: ${result.deletedCount}`,
      );

      if (result.failedIds.length > 0) {
        showActionError(
          {
            success: false,
            error: `Не удалось удалить ${result.failedIds.length} из ${selectedRowKeys.length} сертификатов`,
          },
          'Массовое удаление',
          'Часть сертификатов осталась в системе',
        );
        setSelectedRowKeys(result.failedIds);
      } else {
        setSelectedRowKeys([]);
      }
    } catch (err) {
      showActionError(err, 'Массовое удаление сертификатов', 'Не удалось удалить выбранные сертификаты');
    }
  };

  useEffect(() => {
    if (error) {
      showActionError(error, 'Загрузка списка сертификатов', 'Не удалось получить список сертификатов');
    }
  }, [error]);

  useEffect(() => {
    if (!initial.success) {
      showActionError(
        initial,
        'Загрузка списка сертификатов',
        'Не удалось получить список сертификатов',
      );
    }
  }, [initial]);

  const hasAnyCertificates = !isPending && data.length > 0;
  const isFilteredEmpty = hasAnyCertificates && filteredData.length === 0;
  const isEmpty = !isPending && data.length === 0;
  const isInitialLoading = isPending && data.length === 0;
  const deleting = isDeleting || isBulkDeleting;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <CertificateDetailDialog
        certificateId={detailCertificateId}
        open={detailOpen}
        onOpenChange={(next) => {
          setDetailOpen(next);
          if (!next) setDetailCertificateId(null);
        }}
      />

      <Card className="w-full shrink-0 border-border/70 shadow-sm">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-3 lg:gap-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
              data-page-search-input
              placeholder="Поиск по ФИО, серийнику и остальным полям"
              className="h-11 w-full pl-9"
            />
            </div>
            <FilterSelect
              items={FILTER_FIELDS}
              value={selectedFields}
              onValueChange={setSelectedFields}
            />
            <GroupBySelect value={groupBy} onValueChange={setGroupBy} />
            <CertificateExportButton
              data={filteredData}
              selectedIds={selectedRowKeys}
              activePreset={activePreset}
              expiryThresholds={expiryThresholds}
              disabled={isPending}
            />
            <UploadDialog />
          </div>

          {hasAnyCertificates ? (
            <CertificatePresetFilters
              activePreset={activePreset}
              counts={presetCounts}
              onChange={updatePreset}
            />
          ) : null}
        </CardContent>
      </Card>

      {hasAnyCertificates && <CertificatesStats stats={stats} loading={isPending} />}

      <Card className="flex min-h-0 w-full flex-1 flex-col gap-0 overflow-hidden border-border/70 py-0 shadow-sm">
        <CardHeader className="shrink-0 border-b border-border/70 px-6 py-3">
          {hasAnyCertificates ? (
            <CertificatesTableHeader
              totalCount={filteredData.length}
              totalInSystem={data.length}
              activePreset={activePreset}
              selectedCount={selectedRowKeys.length}
              deleting={deleting}
              onClearSelection={() => setSelectedRowKeys([])}
              onBulkDelete={handleBulkDelete}
            />
          ) : (
            <h2 className="text-base font-semibold text-foreground">
              Список сертификатов
            </h2>
          )}
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          {isInitialLoading ? (
            <TableSkeleton rows={10} columns={6} />
          ) : isEmpty ? (
            <div className="px-6 py-14">
              <div className="rounded-2xl border border-dashed border-border bg-accent/40 px-6 py-12 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                  <FileBadge2 className="size-6" />
                </div>

                <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                  Список сертификатов пока пуст
                </h2>

                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  После первой загрузки здесь появятся записи с названием
                  сертификата, центром сертификации, сроком действия и текущим
                  статусом.
                </p>

                <div className="mt-5 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    className="cursor-pointer"
                    disabled={isPending}
                  >
                    Обновить список
                  </Button>
                </div>
              </div>
            </div>
          ) : isFilteredEmpty ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-medium text-foreground">
                По выбранному фильтру записей нет
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Попробуйте другой быстрый фильтр или сбросьте текущий.
              </p>
              <Button
                variant="outline"
                className="mt-4 cursor-pointer"
                onClick={() => updatePreset(null)}
              >
                Сбросить фильтр
              </Button>
            </div>
          ) : (
            <CertificatesTable
              data={filteredData}
              groupBy={groupBy}
              selectedRowKeys={selectedRowKeys}
              onSelectionChange={setSelectedRowKeys}
              loading={isPending}
              deleting={deleting}
              onView={openCertificateDetail}
              onDelete={handleDeleteCertificate}
              expiryThresholds={expiryThresholds}
              className="min-h-0 flex-1"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
