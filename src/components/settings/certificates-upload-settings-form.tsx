'use client';

import { Checkbox, Form, Input, InputNumber } from 'antd';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { DEFAULT_UPLOAD_LIMITS } from '@/lib/app-settings-defaults';
import { useUpdateAppSettings } from '@/hooks/use-settings';
import type { AppSettings } from '@/generated/prisma/client';

import {
  SettingsLabelWithTooltip,
  SettingsSectionCard,
  stableStringify,
} from './settings-ui';

const CERT_TYPE_OPTIONS = DEFAULT_UPLOAD_LIMITS.allowedCertTypes.map((ext) => ({
  label: ext,
  value: ext,
}));

const DOC_TYPE_OPTIONS = DEFAULT_UPLOAD_LIMITS.allowedDocTypes.map((ext) => ({
  label: ext,
  value: ext,
}));

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

type CertificatesUploadSettingsFormProps = {
  settings: AppSettings;
  onDirtyChange?: (dirty: boolean) => void;
};

function buildFormValues(settings: AppSettings) {
  return {
    warningDays: settings.warningDays,
    criticalDays: settings.criticalDays,
    cronCheckTime: settings.cronCheckTime,
    maxFileSizeMb: settings.maxFileSizeMb,
    allowedCertTypes: settings.allowedCertTypes,
    allowedDocTypes: settings.allowedDocTypes,
  };
}

export function CertificatesUploadSettingsForm({
  settings,
  onDirtyChange,
}: CertificatesUploadSettingsFormProps) {
  const [form] = Form.useForm();
  const { mutateAsync, isPending } = useUpdateAppSettings();

  // Не перезаписываем «грязную» форму при обновлении настроек из БД.
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

  const handleValuesChange = (changed: Record<string, unknown>) => {
    // Пороги связаны: после правки одного перевалидируем второй.
    if ('warningDays' in changed || 'criticalDays' in changed) {
      const other =
        'warningDays' in changed ? 'criticalDays' : 'warningDays';
      void form.validateFields([other]).catch(() => undefined);
    }

    const isDirty =
      stableStringify(form.getFieldsValue(true)) !==
      stableStringify(syncedValuesRef.current);
    if (isDirty !== dirtyRef.current) setDirtyState(isDirty);
  };

  const onFinish = async (values: Record<string, unknown>) => {
    await mutateAsync({
      warningDays: values.warningDays,
      criticalDays: values.criticalDays,
      cronCheckTime: values.cronCheckTime,
      maxFileSizeMb: values.maxFileSizeMb,
      allowedCertTypes: values.allowedCertTypes,
      allowedDocTypes: values.allowedDocTypes,
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
              rules={[
                { required: true, message: 'Укажите значение' },
                {
                  validator: async (_, value) => {
                    const critical = form.getFieldValue('criticalDays');
                    if (
                      value != null &&
                      critical != null &&
                      critical > value
                    ) {
                      throw new Error(
                        'Порог предупреждения должен быть не меньше критического',
                      );
                    }
                  },
                },
              ]}
            >
              <InputNumber min={1} max={365} className="w-full" addonAfter="дн." />
            </Form.Item>

            <Form.Item
              name="criticalDays"
              label={
                <SettingsLabelWithTooltip
                  label="Критично (дней)"
                  tooltip="Оранжевая/красная подсветка. Не может быть больше порога предупреждения."
                />
              }
              rules={[
                { required: true, message: 'Укажите значение' },
                {
                  validator: async (_, value) => {
                    const warning = form.getFieldValue('warningDays');
                    if (value != null && warning != null && value > warning) {
                      throw new Error(
                        'Критический порог не может быть больше порога предупреждения',
                      );
                    }
                  },
                },
              ]}
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
            rules={[
              { required: true, message: 'Укажите время' },
              {
                pattern: TIME_PATTERN,
                message: 'Формат: ЧЧ:ММ, например 08:00',
              },
            ]}
          >
            <Input placeholder="08:00" inputMode="numeric" maxLength={5} />
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

      <div className="mt-5 flex items-center justify-end gap-3">
        {dirty ? (
          <span className="text-xs text-muted-foreground">
            Есть несохранённые изменения
          </span>
        ) : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Сохранить настройки сертификатов
        </Button>
      </div>
    </Form>
  );
}
