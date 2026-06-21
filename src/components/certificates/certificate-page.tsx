'use client';

import { FileBadge2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
import { usePublicAppSettings } from '@/hooks/use-settings';
import type { Certificate } from '@/generated/prisma/client';
import type { SafeResult } from '@/types/safe-result-types';
import { CertificateFields } from '@/types/certificate-types';

import { CertificateDetailDialog } from './certificate-detail-dialog';
import { CertificatesStats } from './certificates-stats';
import { CertificatesTable } from './certificates-table';
import { CertificatesTableHeader, GroupBySelect } from './certificates-toolbar';
import { FilterSelect } from './filter-select';
import { UploadDialog } from './upload-dialog/upload-dialog';

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

function getMutationErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  const err = error as { error?: string };
  return err.error ?? 'Не удалось выполнить операцию';
}

export function CertificatesPage({
  initial,
}: {
  initial: SafeResult<Certificate[]>;
}) {
  const [search, setSearch] = useState('');
  const initialData = initial.success ? initial.data : [];
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<CertificateGroupBy>('none');
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

  const stats = useMemo(
    () => computeCertificateStats(data, expiryThresholds),
    [data, expiryThresholds],
  );

  const handleDeleteCertificate = async (id: string) => {
    try {
      await mutateAsync(id);
      setSelectedRowKeys((prev) => prev.filter((key) => key !== id));
      toast.success('Сертификат успешно удален');
    } catch (err) {
      toast.error(getMutationErrorMessage(err));
    }
  };

  const handleBulkDelete = async () => {
    try {
      const result = await bulkDelete(selectedRowKeys);
      if (!result) return;
      toast.success(`Удалено сертификатов: ${result.deletedCount}`);
      if (result.failedIds.length > 0) {
        toast.error(`Не удалось удалить: ${result.failedIds.length}`);
        setSelectedRowKeys(result.failedIds);
      } else {
        setSelectedRowKeys([]);
      }
    } catch (err) {
      toast.error(getMutationErrorMessage(err));
    }
  };

  useEffect(() => {
    if (error) {
      toast.error(getMutationErrorMessage(error));
    }
  }, [error]);

  useEffect(() => {
    if (!initial.success) {
      toast.error(initial.error);
    }
  }, [initial]);

  const isEmpty = !isPending && data.length === 0;
  const deleting = isDeleting || isBulkDeleting;

  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] w-full flex-col gap-5">
      <CertificateDetailDialog
        certificateId={detailCertificateId}
        open={detailOpen}
        onOpenChange={(next) => {
          setDetailOpen(next);
          if (!next) setDetailCertificateId(null);
        }}
      />

      <Card className="w-full shrink-0 border-border/70 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 p-4 lg:gap-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
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
          <UploadDialog />
        </CardContent>
      </Card>

      {!isEmpty && <CertificatesStats stats={stats} loading={isPending} />}

      <Card className="flex min-h-0 w-full flex-1 flex-col border-border/70 shadow-sm">
        <CardHeader className="shrink-0 border-b border-border/70 px-6 py-4">
          {!isEmpty ? (
            <CertificatesTableHeader
              totalCount={data.length}
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

        <CardContent className="min-h-0 flex-1 p-0">
          {isEmpty ? (
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
          ) : (
            <CertificatesTable
              data={data}
              groupBy={groupBy}
              selectedRowKeys={selectedRowKeys}
              onSelectionChange={setSelectedRowKeys}
              loading={isPending}
              deleting={deleting}
              onView={openCertificateDetail}
              onDelete={handleDeleteCertificate}
              expiryThresholds={expiryThresholds}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
