'use client';

import { ConfigProvider, Form, Input, Switch } from 'antd';
import { Loader2, UserRound } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { EmployeeListItem } from '@/lib/employee-table-utils';
import { showActionError, showActionSuccess } from '@/lib/toast-messages';
import { cn } from '@/lib/utils';

type EmployeeFormValues = {
  fullName: string;
  email: string;
  adUsername: string;
  department?: string;
  position?: string;
  isActive: boolean;
};

type EmployeeFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  employee?: EmployeeListItem | null;
  onSubmit: (values: EmployeeFormValues) => Promise<void>;
  submitting?: boolean;
};

export function EmployeeFormDialog({
  open,
  onOpenChange,
  mode,
  employee,
  onSubmit,
  submitting = false,
}: EmployeeFormDialogProps) {
  const [form] = Form.useForm<EmployeeFormValues>();

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && employee) {
      form.setFieldsValue({
        fullName: employee.fullName,
        email: employee.email,
        adUsername: employee.adUsername ?? '',
        department: employee.department ?? '',
        position: employee.position ?? '',
        isActive: employee.isActive,
      });
      return;
    }

    form.setFieldsValue({
      fullName: '',
      email: '',
      adUsername: '',
      department: '',
      position: '',
      isActive: true,
    });
  }, [open, mode, employee, form]);

  const handleFinish = async (values: EmployeeFormValues) => {
    try {
      await onSubmit(values);
      showActionSuccess(
        mode === 'create' ? 'Сотрудник добавлен' : 'Данные обновлены',
        values.fullName,
      );
      onOpenChange(false);
    } catch (error) {
      showActionError(
        error,
        mode === 'create' ? 'Добавление сотрудника' : 'Обновление сотрудника',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[520px]">
        <div className="border-b border-border/70 bg-accent/20 px-6 pb-5 pt-6">
          <DialogHeader className="gap-3 pr-8 text-left">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
                <UserRound className="size-5" />
              </div>
              <div className="min-w-0 space-y-1.5">
                <DialogTitle className="text-lg leading-snug">
                  {mode === 'create' ? 'Новый сотрудник' : 'Редактирование сотрудника'}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  {mode === 'create'
                    ? 'Добавьте сотрудника вручную. При загрузке сертификата запись также может создаваться автоматически из AD.'
                    : 'Измените контактные данные или статус активности.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#b45309',
              borderRadius: 10,
              controlHeight: 44,
            },
            components: {
              Form: {
                itemMarginBottom: 20,
                verticalLabelPadding: '0 0 6px',
              },
            },
          }}
        >
          <Form
            form={form}
            layout="vertical"
            className="px-6 py-6"
            onFinish={handleFinish}
            requiredMark={false}
          >
            <div className="rounded-xl border border-border/70 bg-background/80 p-4 sm:p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Основные данные
              </p>

              <Form.Item
                name="fullName"
                label="ФИО"
                rules={[{ required: true, message: 'Укажите ФИО' }]}
              >
                <Input placeholder="Иванов Иван Иванович" />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[{ required: true, message: 'Укажите email' }]}
              >
                <Input placeholder="ivanov@company.local" />
              </Form.Item>

              <Form.Item
                name="adUsername"
                label="Логин AD"
                rules={[{ required: true, message: 'Укажите логин' }]}
                className="!mb-0"
              >
                <Input placeholder="ivanov.ii" />
              </Form.Item>
            </div>

            <div className="mt-5 rounded-xl border border-border/70 bg-background/80 p-4 sm:p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Организация
              </p>

              <div className="grid gap-x-4 sm:grid-cols-2">
                <Form.Item name="department" label="Отдел">
                  <Input placeholder="ИТ-отдел" />
                </Form.Item>

                <Form.Item name="position" label="Должность" className="!mb-0 sm:!mb-0">
                  <Input placeholder="Инженер" />
                </Form.Item>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-4 py-3.5 sm:px-5">
              <div>
                <p className="text-sm font-medium text-foreground">Активен</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Неактивные сотрудники скрыты из списка при загрузке сертификатов
                </p>
              </div>
              <Form.Item
                name="isActive"
                valuePropName="checked"
                className="!mb-0"
              >
                <Switch />
              </Form.Item>
            </div>
          </Form>
        </ConfigProvider>

        <DialogFooter
          className={cn(
            '!m-0 gap-3 border-t border-border/70 bg-muted/30 px-6 py-4',
            'flex-col-reverse sm:flex-row sm:justify-end',
          )}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            Отмена
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => form.submit()}
            className="w-full sm:w-auto"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {mode === 'create' ? 'Добавить' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
