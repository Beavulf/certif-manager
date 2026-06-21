'use client';

import { Checkbox, ConfigProvider, Form, Input, InputNumber, Select, Switch } from 'antd';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { TIMEZONE_OPTIONS } from '@/lib/app-settings-defaults';
import { useUpdateAppSettings } from '@/hooks/use-settings';
import type { AppSettings } from '@/generated/prisma/client';

import {
  SettingsLabelWithTooltip,
  SettingsSectionCard,
} from './settings-ui';

type GeneralSettingsFormProps = {
  settings: AppSettings;
};

export function GeneralSettingsForm({ settings }: GeneralSettingsFormProps) {
  const [form] = Form.useForm();
  const { mutateAsync, isPending } = useUpdateAppSettings();

  useEffect(() => {
    form.setFieldsValue({
      appName: settings.appName,
      organizationName: settings.organizationName ?? '',
      timezone: settings.timezone,
      adEmailDomain: settings.adEmailDomain ?? '',
      auditLogRetentionDays: settings.auditLogRetentionDays,
    });
  }, [form, settings]);

  const onFinish = async (values: Record<string, unknown>) => {
    await mutateAsync({
      appName: values.appName,
      organizationName: values.organizationName || null,
      timezone: values.timezone,
      adEmailDomain: values.adEmailDomain || null,
      auditLogRetentionDays: values.auditLogRetentionDays,
      warningDays: settings.warningDays,
      criticalDays: settings.criticalDays,
      maxFileSizeMb: settings.maxFileSizeMb,
      allowedCertTypes: settings.allowedCertTypes,
      allowedDocTypes: settings.allowedDocTypes,
      cronCheckTime: settings.cronCheckTime,
    });
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#b45309',
          borderRadius: 10,
        },
      }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        <div className="grid gap-5 xl:grid-cols-2">
          <SettingsSectionCard
            title="Организация"
            description="Отображается в интерфейсе и может использоваться в письмах."
          >
            <Form.Item
              name="appName"
              label={
                <SettingsLabelWithTooltip
                  label="Название системы"
                  tooltip="Короткое имя приложения в шапке и уведомлениях."
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
                  tooltip="Полное название компании для отображения в интерфейсе."
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
              <Select options={[...TIMEZONE_OPTIONS]} />
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

        <div className="mt-5 flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Сохранить общие настройки
          </Button>
        </div>
      </Form>
    </ConfigProvider>
  );
}
