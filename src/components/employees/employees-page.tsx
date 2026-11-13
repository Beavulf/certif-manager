'use client';

import { Select } from 'antd';
import { FileSpreadsheet, Plus, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { EmployeeBulkActions } from '@/components/employees/employee-bulk-actions';
import { EmployeeDetailDialog } from '@/components/employees/employee-detail-dialog';
import { EmployeeFormDialog } from '@/components/employees/employee-form-dialog';
import { EmployeeImportDialog } from '@/components/employees/employee-import-dialog';
import { EmployeePresetFilters } from '@/components/employees/employee-preset-filters';
import { EmployeesEmptyState } from '@/components/employees/employees-empty-state';
import { EmployeesStats } from '@/components/employees/employees-stats';
import { EmployeesTable } from '@/components/employees/employees-table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useBulkAssignCertificates,
  useBulkDeactivateEmployees,
  useCreateEmployee,
  useDeleteEmployee,
  useGetEmployeesPage,
  useUpdateEmployee,
} from '@/hooks/use-employee';
import {
  applyEmployeePreset,
  countByEmployeePreset,
  getPresetLabel,
  isEmployeePresetId,
  type EmployeePresetId,
} from '@/lib/employee-presets';
import {
  computeEmployeeStats,
  filterEmployees,
  type EmployeeListItem,
  type EmployeeStatusFilter,
} from '@/lib/employee-table-utils';
import { showActionError, showActionSuccess } from '@/lib/toast-messages';
import type { SafeResult } from '@/types/safe-result-types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Все статусы' },
  { value: 'active', label: 'Только активные' },
  { value: 'inactive', label: 'Только неактивные' },
] as const;

type EmployeesPageProps = {
  initial: SafeResult<EmployeeListItem[]>;
};

export function EmployeesPage({ initial }: EmployeesPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetParam = searchParams.get('preset');
  const actionParam = searchParams.get('action');
  const highlightId = searchParams.get('highlight');

  // При сбое серверной загрузки передаём undefined: пустой массив означал бы
  // «свежие данные» в react-query, и таблица молча простояла бы пустой.
  const initialData = initial.success ? initial.data : undefined;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<EmployeeStatusFilter>('all');
  const [activePreset, setActivePreset] = useState<EmployeePresetId | null>(
    isEmployeePresetId(presetParam) ? presetParam : null,
  );
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingEmployee, setEditingEmployee] =
    useState<EmployeeListItem | null>(null);

  const { data = [], isPending, error, refetch } = useGetEmployeesPage(initialData);
  const { mutateAsync: createEmployee, isPending: isCreating } =
    useCreateEmployee();
  const { mutateAsync: updateEmployee, isPending: isUpdating } =
    useUpdateEmployee();
  const { mutateAsync: deleteEmployee, isPending: isDeleting } =
    useDeleteEmployee();
  const { mutateAsync: bulkDeactivate, isPending: isBulkDeactivating } =
    useBulkDeactivateEmployees();
  const { mutateAsync: bulkAssign, isPending: isBulkAssigning } =
    useBulkAssignCertificates();

  const searched = useMemo(
    () => filterEmployees(data, search, statusFilter),
    [data, search, statusFilter],
  );

  const filtered = useMemo(
    () => applyEmployeePreset(searched, activePreset),
    [searched, activePreset],
  );

  const presetCounts = useMemo(() => countByEmployeePreset(data), [data]);
  const stats = useMemo(() => computeEmployeeStats(data), [data]);

  const updatePreset = useCallback(
    (preset: EmployeePresetId | null) => {
      setActivePreset(preset);
      setSelectedRowKeys([]);

      const params = new URLSearchParams(searchParams.toString());
      if (preset) params.set('preset', preset);
      else params.delete('preset');

      const query = params.toString();
      router.replace(query ? `/employees?${query}` : '/employees', {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const openCreate = () => {
    setFormMode('create');
    setEditingEmployee(null);
    setFormOpen(true);
  };

  const openEdit = (employee: EmployeeListItem) => {
    setFormMode('edit');
    setEditingEmployee(employee);
    setDetailOpen(false);
    setFormOpen(true);
  };

  const openDetail = (id: string) => {
    setDetailEmployeeId(id);
    setDetailOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const deleted = await deleteEmployee(id);
      showActionSuccess(
        'Сотрудник удалён',
        deleted ? deleted.fullName : undefined,
      );
      if (detailEmployeeId === id) {
        setDetailOpen(false);
        setDetailEmployeeId(null);
      }
    } catch (err) {
      showActionError(err, 'Удаление сотрудника');
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      const result = await bulkDeactivate(selectedRowKeys);
      showActionSuccess(
        'Деактивация завершена',
        `Обновлено сотрудников: ${result?.updatedCount ?? 0}`,
      );
      setSelectedRowKeys([]);
    } catch (err) {
      showActionError(err, 'Массовая деактивация');
    }
  };

  const handleBulkAssign = async () => {
    try {
      const result = await bulkAssign(selectedRowKeys);
      showActionSuccess(
        'Привязка завершена',
        `Привязано: ${result?.assignedCount ?? 0}${
          result?.skippedCount ? ` · без совпадений: ${result.skippedCount}` : ''
        }`,
      );
      setSelectedRowKeys([]);
    } catch (err) {
      showActionError(err, 'Массовая привязка сертификатов');
    }
  };

  const handleFormSubmit = async (values: {
    fullName: string;
    email: string;
    adUsername: string;
    department?: string;
    position?: string;
    isActive: boolean;
  }) => {
    if (formMode === 'create') {
      await createEmployee({
        fullName: values.fullName,
        email: values.email,
        adUsername: values.adUsername,
        department: values.department || undefined,
        position: values.position || undefined,
        isActive: values.isActive,
      });
      return;
    }

    if (!editingEmployee) return;

    await updateEmployee({
      employeeId: editingEmployee.id,
      values: {
        fullName: values.fullName,
        email: values.email,
        adUsername: values.adUsername,
        department: values.department || undefined,
        position: values.position || undefined,
        isActive: values.isActive,
      },
    });
  };

  useEffect(() => {
    if (isEmployeePresetId(presetParam)) {
      setActivePreset(presetParam);
    } else if (!presetParam) {
      setActivePreset(null);
    }
  }, [presetParam]);

  useEffect(() => {
    if (actionParam === 'create') {
      openCreate();
      const params = new URLSearchParams(searchParams.toString());
      params.delete('action');
      const query = params.toString();
      router.replace(query ? `/employees?${query}` : '/employees', {
        scroll: false,
      });
    }
  }, [actionParam, router, searchParams]);

  useEffect(() => {
    if (highlightId) {
      openDetail(highlightId);
    }
  }, [highlightId]);

  useEffect(() => {
    if (error) {
      showActionError(
        error,
        'Загрузка списка сотрудников',
        'Не удалось получить список сотрудников',
      );
    }
  }, [error]);

  useEffect(() => {
    if (!initial.success) {
      showActionError(
        initial,
        'Загрузка списка сотрудников',
        'Не удалось получить список сотрудников',
      );
    }
  }, [initial]);

  const isEmpty = !isPending && data.length === 0;
  const isInitialLoading = isPending && data.length === 0;
  const hasData = !isPending && data.length > 0;
  const isFilteredEmpty = hasData && filtered.length === 0;
  const submitting = isCreating || isUpdating;
  const bulkBusy = isBulkDeactivating || isBulkAssigning;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <EmployeeDetailDialog
        employeeId={detailEmployeeId}
        open={detailOpen}
        onOpenChange={(next) => {
          setDetailOpen(next);
          if (!next) setDetailEmployeeId(null);
        }}
        onEdit={(id) => {
          const employee = data.find((item) => item.id === id);
          if (employee) openEdit(employee);
        }}
      />

      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        employee={editingEmployee}
        onSubmit={handleFormSubmit}
        submitting={submitting}
      />

      <EmployeeImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => refetch()}
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
                placeholder="Поиск по ФИО, email, отделу, логину"
                className="h-11 w-full pl-9"
              />
            </div>

            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={STATUS_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              className="h-11 min-w-[180px]"
            />

            <Button
              type="button"
              variant="outline"
              className="h-11 cursor-pointer gap-2"
              onClick={() => setImportOpen(true)}
            >
              <FileSpreadsheet className="size-4" />
              Импорт CSV
            </Button>

            <Button type="button" className="h-11 cursor-pointer gap-2" onClick={openCreate}>
              <Plus className="size-4" />
              Добавить сотрудника
            </Button>
          </div>

          {hasData ? (
            <EmployeePresetFilters
              activePreset={activePreset}
              counts={presetCounts}
              onChange={updatePreset}
            />
          ) : null}

          <EmployeeBulkActions
            selectedCount={selectedRowKeys.length}
            busy={bulkBusy}
            onDeactivate={handleBulkDeactivate}
            onAssignCertificates={handleBulkAssign}
            onClearSelection={() => setSelectedRowKeys([])}
          />
        </CardContent>
      </Card>

      {hasData && <EmployeesStats stats={stats} loading={isPending} />}

      <Card className="flex min-h-0 w-full flex-1 flex-col gap-0 overflow-hidden border-border/70 py-0 shadow-sm">
        <CardHeader className="shrink-0 border-b border-border/70 px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">
              {isEmpty
                ? 'Список сотрудников'
                : `Сотрудники · ${filtered.length}`}
              {activePreset ? (
                <span className="ml-2 text-sm font-medium text-amber-800">
                  · {getPresetLabel(activePreset)}
                </span>
              ) : null}
            </h2>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          {isInitialLoading ? (
            <TableSkeleton rows={10} columns={6} />
          ) : isEmpty ? (
            <EmployeesEmptyState
              onCreate={openCreate}
              onImport={() => setImportOpen(true)}
              onRefresh={() => refetch()}
              refreshing={isPending}
            />
          ) : isFilteredEmpty ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-medium text-foreground">
                По выбранному фильтру сотрудников нет
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
            <EmployeesTable
              data={filtered}
              loading={isPending}
              deleting={isDeleting}
              selectedRowKeys={selectedRowKeys}
              onSelectionChange={setSelectedRowKeys}
              onView={openDetail}
              onEdit={openEdit}
              onDelete={handleDelete}
              className="min-h-0 flex-1 px-2 py-2"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
