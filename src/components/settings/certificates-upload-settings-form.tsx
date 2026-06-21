'use client';

import { Checkbox, ConfigProvider, Form, Input, InputNumber } from 'antd';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { DEFAULT_UPLOAD_LIMITS } from '@/lib/app-settings-defaults';
import { useUpdateAppSettings } from '@/hooks/use-settings';
import type { AppSettings } from '@/generated/prisma/client';

import {
  SettingsLabelWithTooltip,
  SettingsSectionCard,
} from './settings-ui';

const CERT_TYPE_OPTIONS = DEFAULT_UPLOAD_LIMITS.allowedCertTypes.map((ext) => ({
  label: ext,
  value: ext,
}));

const DOC_TYPE_OPTIONS = DEFAULT_UPLOAD_LIMITS.allowedDocTypes.map((ext) => ({
  label: ext,
  value: ext,
}));

type CertificatesUploadSettingsFormProps = {
  settings: AppSettings;
};

export function CertificatesUploadSettingsForm({
  settings,
}: CertificatesUploadSettingsFormProps) {
  const [form] = Form.useForm();
  const { mutateAsync, isPending } = useUpdateAppSettings();

  useEffect(() => {
    form.setFieldsValue({
      warningDays: settings.warningDays,
      criticalDays: settings.criticalDays,
      cronCheckTime: settings.cronCheckTime,
      maxFileSizeMb: settings.maxFileSizeMb,
      allowedCertTypes: settings.allowedCertTypes,
      allowedDocTypes: settings.allowedDocTypes,
    });
  }, [form, settings]);

  const onFinish = async (values: Record<string, unknown>) => {
    await mutateAsync({
      appName: settings.appName,
      organizationName: settings.organizationName,
      timezone: settings.timezone,
      adEmailDomain: settings.adEmailDomain,
      auditLogRetentionDays: settings.auditLogRetentionDays,
      warningDays: values.warningDays,
      criticalDays: values.criticalDays,
      cronCheckTime: values.cronCheckTime,
      maxFileSizeMb: values.maxFileSizeMb,
      allowedCertTypes: values.allowedCertTypes,
      allowedDocTypes: values.allowedDocTypes,
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
            title="Пороги срочности"
            description="Определяют цветовую подсветку строк в таблице сертификатов."
          >
            <div className="grid grid-cols-2 gap-3">
              <Form.Item
                name="warningDays"
                label={
                  <SettingsLabelWithTooltip
                    label="Предупреждение (дней)"
                    tooltip="Жёлтая подсветка: сертификат истекает в указанный срок или раньше."
                  />
                }
                rules={[{ required: true, message: 'Укажите значение' }]}
              >
                <InputNumber min={1} max={365} className="w-full" addonAfter="дн." />
              </Form.Item>

              <Form.Item
                name="criticalDays"
                label={
                  <SettingsLabelWithTooltip
                    label="Критично (дней)"
                    tooltip="Оранжевая/красная подсветка. Должно быть меньше или равно порогу предупреждения."
                  />
                }
                rules={[{ required: true, message: 'Укажите значение' }]}
              >
                <InputNumber min={1} max={365} className="w-full" addonAfter="дн." />
              </Form.Item>
            </div>

            <Form.Item
              name="cronCheckTime"
              label={
                <SettingsLabelWithTooltip
                  label="Время ежедневной проверки"
                  tooltip="Cron-задача проверяет сертификаты и отправляет письма в это время (формат ЧЧ:ММ)."
                />
              }
              rules={[{ required: true, message: 'Укажите время' }]}
            >
              <Input placeholder="08:00" />
            </Form.Item>
          </SettingsSectionCard>

          <SettingsSectionCard
            title="Загрузка файлов"
            description="Ограничения для сертификатов и прикреплённых документов."
          >
            <Form.Item
              name="maxFileSizeMb"
              label={
                <SettingsLabelWithTooltip
                  label="Максимальный размер файла"
                  tooltip="Применяется при загрузке сертификатов (.cer, .p7b) и документов."
                />
              }
              rules={[{ required: true, message: 'Укажите лимит' }]}
            >
              <InputNumber min={1} max={100} className="w-full" addonAfter="МБ" />
            </Form.Item>

            <Form.Item
              name="allowedCertTypes"
              label={
                <SettingsLabelWithTooltip
                  label="Типы сертификатов"
                  tooltip="Расширения файлов, разрешённых для загрузки сертификатов."
                />
              }
              rules={[{ required: true, message: 'Выберите типы' }]}
            >
              <Checkbox.Group options={CERT_TYPE_OPTIONS} className="flex flex-wrap gap-3" />
            </Form.Item>

            <Form.Item
              name="allowedDocTypes"
              label={
                <SettingsLabelWithTooltip
                  label="Типы документов"
                  tooltip="Расширения файлов, разрешённых для прикрепления к сертификату."
                />
              }
              rules={[{ required: true, message: 'Выберите типы' }]}
            >
              <Checkbox.Group options={DOC_TYPE_OPTIONS} className="flex flex-wrap gap-3" />
            </Form.Item>
          </SettingsSectionCard>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Сохранить настройки сертификатов
          </Button>
        </div>
      </Form>
    </ConfigProvider>
  );
}
