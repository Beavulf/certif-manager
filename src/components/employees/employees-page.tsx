'use client';

import { Select } from 'antd';
import { Plus, Search, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { EmployeeDetailDialog } from '@/components/employees/employee-detail-dialog';
import { EmployeeFormDialog } from '@/components/employees/employee-form-dialog';
import { EmployeesStats } from '@/components/employees/employees-stats';
import { EmployeesTable } from '@/components/employees/employees-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useCreateEmployee,
  useDeleteEmployee,
  useGetEmployeesPage,
  useUpdateEmployee,
} from '@/hooks/use-employee';
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
  const initialData = initial.success ? initial.data : [];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<EmployeeStatusFilter>('all');

  const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
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

  const filtered = useMemo(
    () => filterEmployees(data, search, statusFilter),
    [data, search, statusFilter],
  );

  const stats = useMemo(() => computeEmployeeStats(data), [data]);

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
  const submitting = isCreating || isUpdating;

  return (
    <div className="flex max-h-[calc(100dvh-10rem)] min-h-0 w-full flex-col gap-5 overflow-hidden">
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

      <Card className="w-full shrink-0 border-border/70 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 p-4 lg:gap-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
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

          <Button type="button" className="h-11 cursor-pointer" onClick={openCreate}>
            <Plus className="size-4" />
            Добавить сотрудника
          </Button>
        </CardContent>
      </Card>

      {!isEmpty && <EmployeesStats stats={stats} loading={isPending} />}

      <Card className="flex min-h-0 w-full flex-1 flex-col border-border/70 shadow-sm">
        <CardHeader className="shrink-0 border-b border-border/70 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">
              {isEmpty ? 'Список сотрудников' : `Сотрудники · ${filtered.length}`}
            </h2>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 p-0">
          {isEmpty ? (
            <div className="px-6 py-14">
              <div className="rounded-2xl border border-dashed border-border bg-accent/40 px-6 py-12 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                  <UserRound className="size-6" />
                </div>

                <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                  Сотрудники пока не добавлены
                </h2>

                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Добавьте сотрудника вручную или загрузите сертификат с
                  автоматическим созданием из Active Directory.
                </p>

                <div className="mt-5 flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    className="cursor-pointer"
                    onClick={openCreate}
                  >
                    <Plus className="size-4" />
                    Добавить сотрудника
                  </Button>
                  <Button
                    type="button"
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
            <EmployeesTable
              data={filtered}
              loading={isPending}
              deleting={isDeleting}
              onView={openDetail}
              onEdit={openEdit}
              onDelete={handleDelete}
              className="px-2 py-2"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
