'use client';

import { Form, Input, InputNumber, Select } from 'antd';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { TIMEZONE_OPTIONS } from '@/lib/app-settings-defaults';
import { useUpdateAppSettings } from '@/hooks/use-settings';
import type { AppSettings } from '@/generated/prisma/client';

import {
  SettingsLabelWithTooltip,
  SettingsSectionCard,
  stableStringify,
} from './settings-ui';

type GeneralSettingsFormProps = {
  settings: AppSettings;
  onDirtyChange?: (dirty: boolean) => void;
};

function buildFormValues(settings: AppSettings) {
  return {
    appName: settings.appName,
    organizationName: settings.organizationName ?? '',
    timezone: settings.timezone,
    adEmailDomain: settings.adEmailDomain ?? '',
    auditLogRetentionDays: settings.auditLogRetentionDays,
  };
}

export function GeneralSettingsForm({
  settings,
  onDirtyChange,
}: GeneralSettingsFormProps) {
  const [form] = Form.useForm();
  const { mutateAsync, isPending } = useUpdateAppSettings();

  // Ключ последней синхронизации (версия настроек в БД) и признак несохранённого ввода:
  // пока форма «грязная», обновление настроек её не перезаписывает.
  const syncedKeyRef = useRef<string | null>(null);
  const syncedValuesRef = useRef<Record<string, unknown> | null>(null);
  const dirtyRef = useRef(false);
  const [dirty, setDirty] = useState(false);

  const setDirtyState = (value: boolean) => {
    dirtyRef.current = value;
    setDirty(value);
    onDirtyChange?.(value);
  };

  const applyFormValues = (values: Record<string, unknown>) => {
    form.setFieldsValue(values);
    syncedValuesRef.current = values;
    if (dirtyRef.current) setDirtyState(false);
  };

  useEffect(() => {
    const syncKey = new Date(settings.updatedAt).toISOString();
    if (syncedKeyRef.current === syncKey) return;
    syncedKeyRef.current = syncKey;
    if (dirtyRef.current) return;
    applyFormValues(buildFormValues(settings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, settings]);

  const handleValuesChange = () => {
    const isDirty =
      stableStringify(form.getFieldsValue(true)) !==
      stableStringify(syncedValuesRef.current);
    if (isDirty !== dirtyRef.current) setDirtyState(isDirty);
  };

  const onFinish = async (values: Record<string, unknown>) => {
    await mutateAsync({
      appName: values.appName,
      organizationName: values.organizationName || null,
      timezone: values.timezone,
      adEmailDomain: values.adEmailDomain || null,
      auditLogRetentionDays: values.auditLogRetentionDays,
    });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      onValuesChange={handleValuesChange}
      requiredMark={false}
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsSectionCard
          title="Организация"
          description="Отображается в шапке приложения и в письмах."
        >
          <Form.Item
            name="appName"
            label={
              <SettingsLabelWithTooltip
                label="Название системы"
                tooltip="Короткое имя приложения: шапка интерфейса, заголовок вкладки браузера и письма."
              />
            }
            rules={[{ required: true, message: 'Укажите название' }]}
          >
            <Input placeholder="Cert Manager" />
          </Form.Item>

          <Form.Item
            name="organizationName"
            label={
              <SettingsLabelWithTooltip
                label="Название организации"
                tooltip="Показывается под названием системы в шапке и в подписи писем."
              />
            }
          >
            <Input placeholder="ООО «Пример»" />
          </Form.Item>

          <Form.Item
            name="adEmailDomain"
            label={
              <SettingsLabelWithTooltip
                label="Домен email (AD)"
                tooltip="Используется при синхронизации сотрудника из AD: login@домен. Если пусто — берётся из переменной AD_EMAIL_DOMAIN."
              />
            }
          >
            <Input placeholder="company.local" />
          </Form.Item>
        </SettingsSectionCard>

        <SettingsSectionCard
          title="Регион и хранение"
          description="Часовой пояс влияет на расписание cron-задач."
        >
          <Form.Item
            name="timezone"
            label={
              <SettingsLabelWithTooltip
                label="Часовой пояс"
                tooltip="Используется для ежедневной проверки сертификатов и обновления статусов."
              />
            }
            rules={[{ required: true, message: 'Выберите часовой пояс' }]}
          >
            <Select options={[...TIMEZONE_OPTIONS]} showSearch optionFilterProp="label" />
          </Form.Item>

          <Form.Item
            name="auditLogRetentionDays"
            label={
              <SettingsLabelWithTooltip
                label="Хранение журнала аудита (дней)"
                tooltip="Записи старше указанного срока удаляются при сохранении настроек."
              />
            }
            rules={[{ required: true, message: 'Укажите срок хранения' }]}
          >
            <InputNumber min={7} max={3650} className="w-full" addonAfter="дн." />
          </Form.Item>
        </SettingsSectionCard>
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        {dirty ? (
          <span className="text-xs text-muted-foreground">
            Есть несохранённые изменения
          </span>
        ) : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Сохранить общие настройки
        </Button>
      </div>
    </Form>
  );
}
