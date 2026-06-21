'use client';

import {
  Checkbox,
  ConfigProvider,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
} from 'antd';
import { Loader2, Mail, PlugZap } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  useSendTestEmail,
  useUpdateNotificationSettings,
  useVerifySmtp,
} from '@/hooks/use-settings';
import type { NotificationSettingsPublic } from '@/types/settings-types';

import {
  SettingsLabelWithTooltip,
  SettingsSectionCard,
} from './settings-ui';

type NotificationSettingsFormProps = {
  settings: NotificationSettingsPublic;
};

export function NotificationSettingsForm({ settings }: NotificationSettingsFormProps) {
  const [form] = Form.useForm();
  const [testEmail, setTestEmail] = useState('');
  const { mutateAsync, isPending } = useUpdateNotificationSettings();
  const verifySmtp = useVerifySmtp();
  const sendTest = useSendTestEmail();

  useEffect(() => {
    form.setFieldsValue({
      isEnabled: settings.isEnabled,
      daysBeforeExpiry: settings.daysBeforeExpiry,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser ?? '',
      smtpPassword: '',
      senderEmail: settings.senderEmail,
      senderName: settings.senderName ?? '',
    });
  }, [form, settings]);

  const getFormValues = () => form.getFieldsValue(true);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#b45309',
          borderRadius: 10,
        },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => mutateAsync(values)}
      >
        <SettingsSectionCard
          title="Email-уведомления"
          description="Автоматические напоминания сотрудникам об истечении сертификатов."
        >
          <Form.Item
            name="isEnabled"
            label={
              <SettingsLabelWithTooltip
                label="Включить уведомления"
                tooltip="При отключении cron не будет отправлять письма, даже если SMTP настроен."
              />
            }
            valuePropName="checked"
          >
            <Switch checkedChildren="Вкл" unCheckedChildren="Выкл" />
          </Form.Item>

          <Form.Item
            name="daysBeforeExpiry"
            label={
              <SettingsLabelWithTooltip
                label="Дни до истечения"
                tooltip="За сколько дней до validTo отправлять напоминание. Можно указать несколько значений, например 30, 14 и 7."
              />
            }
            rules={[{ required: true, message: 'Укажите хотя бы один день' }]}
          >
            <Select
              mode="tags"
              tokenSeparators={[',', ' ']}
              placeholder="30, 14, 7"
              options={[30, 14, 7, 3, 1].map((day) => ({
                value: day,
                label: `${day} дн.`,
              }))}
            />
          </Form.Item>
        </SettingsSectionCard>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <SettingsSectionCard
            title="SMTP-сервер"
            description="Параметры исходящей почты для отправки уведомлений."
          >
            <Form.Item
              name="smtpHost"
              label={
                <SettingsLabelWithTooltip
                  label="Хост"
                  tooltip="Адрес SMTP-сервера, например smtp.company.local или mail.example.com."
                />
              }
              rules={[{ required: true, message: 'Укажите SMTP-хост' }]}
            >
              <Input placeholder="smtp.company.local" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item
                name="smtpPort"
                label={
                  <SettingsLabelWithTooltip
                    label="Порт"
                    tooltip="Обычно 25, 587 или 465."
                  />
                }
                rules={[{ required: true, message: 'Укажите порт' }]}
              >
                <InputNumber min={1} max={65535} className="w-full" />
              </Form.Item>

              <Form.Item
                name="smtpUser"
                label={
                  <SettingsLabelWithTooltip
                    label="Логин"
                    tooltip="Оставьте пустым, если SMTP не требует авторизации."
                  />
                }
              >
                <Input placeholder="smtp-user" autoComplete="off" />
              </Form.Item>
            </div>

            <Form.Item
              name="smtpPassword"
              label={
                <SettingsLabelWithTooltip
                  label="Пароль SMTP"
                  tooltip={
                    settings.hasSmtpPassword
                      ? 'Пароль сохранён. Оставьте поле пустым, чтобы не менять.'
                      : 'Пароль для SMTP-авторизации.'
                  }
                />
              }
            >
              <Input.Password
                placeholder={
                  settings.hasSmtpPassword ? '•••••••• (не менять)' : 'Пароль'
                }
                autoComplete="new-password"
              />
            </Form.Item>
          </SettingsSectionCard>

          <SettingsSectionCard
            title="Отправитель и проверка"
            description="Адрес отправителя и инструменты диагностики SMTP."
          >
            <Form.Item
              name="senderEmail"
              label={
                <SettingsLabelWithTooltip
                  label="Email отправителя"
                  tooltip="Должен быть разрешён на вашем SMTP-сервере."
                />
              }
              rules={[
                { required: true, message: 'Укажите email' },
                { type: 'email', message: 'Некорректный email' },
              ]}
            >
              <Input placeholder="certs@company.local" />
            </Form.Item>

            <Form.Item
              name="senderName"
              label={
                <SettingsLabelWithTooltip
                  label="Имя отправителя"
                  tooltip="Отображается в поле «От» в почтовом клиенте."
                />
              }
            >
              <Input placeholder="Cert Manager" />
            </Form.Item>

            <div className="rounded-xl border border-dashed border-border/80 bg-accent/30 p-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={verifySmtp.isPending}
                  onClick={() => verifySmtp.mutateAsync(getFormValues())}
                >
                  {verifySmtp.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <PlugZap className="size-4" />
                  )}
                  Проверить соединение
                </Button>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="email@company.local"
                  type="email"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={sendTest.isPending || !testEmail.trim()}
                  onClick={() =>
                    sendTest.mutateAsync({
                      testEmail: testEmail.trim(),
                      settings: getFormValues(),
                    })
                  }
                >
                  {sendTest.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Mail className="size-4" />
                  )}
                  Отправить тест
                </Button>
              </div>
            </div>
          </SettingsSectionCard>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Сохранить уведомления
          </Button>
        </div>
      </Form>
    </ConfigProvider>
  );
}
