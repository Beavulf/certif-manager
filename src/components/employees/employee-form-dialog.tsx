'use client';

import { ConfigProvider, Form, Input, Switch } from 'antd';
import { Loader2, UserRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { EmployeeAdSearchPanel } from '@/components/employees/employee-ad-search-panel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { EmployeeListItem } from '@/lib/employee-table-utils';
import { showActionError, showActionSuccess } from '@/lib/toast-messages';
import { cn } from '@/lib/utils';
import type { EmployeeADSearchItem } from '@/server/actions/employee/search-employee-ad-action';

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

const formTheme = {
  token: {
    colorPrimary: '#b45309',
    borderRadius: 8,
    controlHeight: 36,
    fontSize: 13,
  },
  components: {
    Form: {
      itemMarginBottom: 12,
      verticalLabelPadding: '0 0 4px',
      labelFontSize: 12,
    },
  },
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
  const [adSelectedUsername, setAdSelectedUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setAdSelectedUsername(null);
      return;
    }

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
    setAdSelectedUsername(null);
  }, [open, mode, employee, form]);

  const handleAdSelect = useCallback(
    (item: EmployeeADSearchItem) => {
      form.setFieldsValue({
        fullName: item.fullName,
        email: item.email,
        adUsername: item.adUsername,
        department: item.department || '',
        position: item.position || '',
      });
      setAdSelectedUsername(item.adUsername);
    },
    [form],
  );

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
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[460px]">
        <div className="shrink-0 border-b border-border/60 px-5 py-4">
          <DialogHeader className="gap-0 pr-7 text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-200/80 bg-amber-50 text-amber-700">
                <UserRound className="size-4" />
              </div>
              <DialogTitle className="text-base font-semibold leading-tight">
                {mode === 'create' ? 'Новый сотрудник' : 'Редактирование'}
              </DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <ConfigProvider theme={formTheme}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Form
              form={form}
              layout="vertical"
              size="middle"
              className="space-y-4 px-5 py-4"
              onFinish={handleFinish}
              requiredMark={false}
            >
              {mode === 'create' && (
                <EmployeeAdSearchPanel
                  key={open ? 'ad-search-open' : 'ad-search-closed'}
                  onSelect={handleAdSelect}
                  disabled={submitting}
                  selectedAdUsername={adSelectedUsername}
                />
              )}

              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3.5">
                <Form.Item
                  name="fullName"
                  label="ФИО"
                  rules={[{ required: true, message: 'Укажите ФИО' }]}
                  className="!mb-0"
                >
                  <Input placeholder="Иванов Иван Иванович" />
                </Form.Item>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[{ required: true, message: 'Укажите email' }]}
                    className="!mb-0"
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

                <div className="grid gap-3 sm:grid-cols-2">
                  <Form.Item name="department" label="Отдел" className="!mb-0">
                    <Input placeholder="ИТ-отдел" />
                  </Form.Item>

                  <Form.Item name="position" label="Должность" className="!mb-0">
                    <Input placeholder="Инженер" />
                  </Form.Item>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3.5 py-2.5">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-medium text-foreground">Активен</p>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Скрыт при загрузке сертификатов, если выключен
                  </p>
                </div>
                <Form.Item name="isActive" valuePropName="checked" className="!mb-0">
                  <Switch size="small" />
                </Form.Item>
              </div>
            </Form>
          </div>
        </ConfigProvider>

        <DialogFooter
          className={cn(
            'shrink-0 !m-0 gap-2 border-t border-border/60 bg-muted/20 px-5 py-3',
            'flex-row justify-end',
          )}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="h-8"
          >
            Отмена
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={submitting}
            onClick={() => form.submit()}
            className="h-8 min-w-[88px]"
          >
            {submitting && <Loader2 className="size-3.5 animate-spin" />}
            {mode === 'create' ? 'Добавить' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
