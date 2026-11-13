'use client';

import {
  Checkbox,
  Form,
  Input,
  InputNumber,
  Switch,
} from 'antd';
import { Loader2, Mail, Play, PlugZap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Input as UiInput } from '@/components/ui/input';
import { showValidationError } from '@/lib/toast-messages';
import { Button } from '@/components/ui/button';
import {
  useSendTestEmail,
  useUpdateNotificationSettings,
  useVerifySmtp,
} from '@/hooks/use-settings';
import { useRunNotificationCheck } from '@/hooks/use-notifications';
import type { NotificationSettingsPublic } from '@/types/settings-types';

import { formatDaysList, parseDaysInput } from './days-input';
import { MAX_NOTIFICATION_DAYS } from '@/constants/notification-days';
import {
  SettingsLabelWithTooltip,
  SettingsSectionCard,
  stableStringify,
} from './settings-ui';

type NotificationSettingsFormProps = {
  settings: NotificationSettingsPublic;
  onDirtyChange?: (dirty: boolean) => void;
};

function buildFormValues(settings: NotificationSettingsPublic) {
  return {
    isEnabled: settings.isEnabled,
    daysBeforeExpiryText: formatDaysList(settings.daysBeforeExpiry),
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser ?? '',
    smtpPassword: '',
    senderEmail: settings.senderEmail,
    senderName: settings.senderName ?? '',
  };
}

function toSavePayload(values: Record<string, unknown>) {
  const days = parseDaysInput(String(values.daysBeforeExpiryText ?? ''));

  return {
    isEnabled: Boolean(values.isEnabled),
    daysBeforeExpiry: days,
    smtpHost: String(values.smtpHost ?? '').trim(),
    smtpPort: values.smtpPort,
    smtpUser: values.smtpUser ? String(values.smtpUser).trim() : null,
    smtpPassword: values.smtpPassword ? String(values.smtpPassword) : null,
    senderEmail: String(values.senderEmail ?? '').trim(),
    senderName: values.senderName ? String(values.senderName).trim() : null,
  };
}

export function NotificationSettingsForm({
  settings,
  onDirtyChange,
}: NotificationSettingsFormProps) {
  const [form] = Form.useForm();
  const syncedKeyRef = useRef<string | null>(null);
  const syncedValuesRef = useRef<Record<string, unknown> | null>(null);
  const dirtyRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testDaysInput, setTestDaysInput] = useState('');
  const [ignoreAlreadySent, setIgnoreAlreadySent] = useState(false);
  const { mutateAsync, isPending } = useUpdateNotificationSettings();
  const verifySmtp = useVerifySmtp();
  const sendTest = useSendTestEmail();
  const runCheck = useRunNotificationCheck();

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
    const syncKey = `${settings.id}:${new Date(settings.updatedAt).getTime()}`;
    if (syncedKeyRef.current === syncKey) return;
    syncedKeyRef.current = syncKey;
    // Пока есть несохранённый ввод, настройки из БД форму не перезаписывают.
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

  const getSavePayload = () => toSavePayload(form.getFieldsValue(true));

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = toSavePayload(values);

      if (!payload.daysBeforeExpiry.length) {
        showValidationError(
          'Не указаны дни для уведомлений',
          `В поле «Дни до истечения» укажите хотя бы одно значение от 1 до ${MAX_NOTIFICATION_DAYS}`,
        );
        return;
      }

      const saved = await mutateAsync(payload);
      const syncKey = `${saved.id}:${new Date(saved.updatedAt).getTime()}`;
      syncedKeyRef.current = syncKey;
      applyFormValues(buildFormValues(saved));
    } catch (error) {
      const err = error as { errorFields?: unknown };
      if (err?.errorFields) {
        showValidationError(
          'Форма содержит ошибки',
          'Проверьте SMTP-хост, порт, email отправителя и список дней',
        );
      }
    }
  };

  const runManualCheck = async () => {
    const testDays = parseDaysInput(testDaysInput);
    const mainDays = parseDaysInput(
      String(form.getFieldValue('daysBeforeExpiryText') ?? ''),
    );

    const daysBeforeExpiry = testDays.length > 0 ? testDays : mainDays;

    if (!daysBeforeExpiry.length) {
      showValidationError(
        'Не указаны дни для проверки',
        'Заполните тестовое поле или основную настройку «Дни до истечения»',
      );
      return;
    }

    await runCheck.mutateAsync({
      daysBeforeExpiry,
      ignoreAlreadySent: ignoreAlreadySent || undefined,
      useTestDays: testDays.length > 0,
    });
  };

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        requiredMark={false}
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
            name="daysBeforeExpiryText"
            label={
              <SettingsLabelWithTooltip
                label="Дни до истечения"
                tooltip="За сколько дней до validTo отправлять напоминание. Через запятую: 30, 14, 7."
              />
            }
            rules={[
              {
                validator: async (_, value) => {
                  const parsed = parseDaysInput(String(value ?? ''));
                  if (!parsed.length) {
                    throw new Error(`Укажите хотя бы один день (1–${MAX_NOTIFICATION_DAYS})`);
                  }
                },
              },
            ]}
          >
            <Input placeholder="30, 14, 7" />
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
                  onClick={() => {
                    void verifySmtp.mutateAsync(getSavePayload()).catch(() => undefined);
                  }}
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
                <UiInput
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
                  onClick={() => {
                    void sendTest
                      .mutateAsync({
                        testEmail: testEmail.trim(),
                        settings: getSavePayload(),
                      })
                      .catch(() => undefined);
                  }}
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

        <div className="mt-5 flex items-center justify-end gap-3">
          {dirty ? (
            <span className="text-xs text-muted-foreground">
              Есть несохранённые изменения
            </span>
          ) : null}
          <Button type="button" disabled={isPending} onClick={handleSave}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Сохранить уведомления
          </Button>
        </div>
      </Form>

      <SettingsSectionCard
        title="Ручная проверка"
        description="Тестовый запуск без влияния на cron. Дни из тестового поля имеют приоритет."
        className="mt-5"
      >
        <div className="space-y-3">
          <div>
            <SettingsLabelWithTooltip
              label="Дни для тестового запуска"
              tooltip="Если указано — проверка только по этим дням. Если пусто — берутся дни из поля «Дни до истечения» (можно не сохранять)."
              className="mb-2"
            />
            <UiInput
              value={testDaysInput}
              onChange={(e) => setTestDaysInput(e.target.value)}
              placeholder="Например: 45"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Одно число или несколько через запятую (1–{MAX_NOTIFICATION_DAYS}).
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={ignoreAlreadySent}
              onChange={(e) => setIgnoreAlreadySent(e.target.checked)}
            />
            <span>Повторить, даже если уже отправлялось сегодня</span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={runCheck.isPending}
              onClick={() => {
                void runManualCheck().catch(() => undefined);
              }}
            >
              {runCheck.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              Запустить проверку сейчас
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/notifications">Журнал уведомлений</Link>
            </Button>
          </div>
        </div>
      </SettingsSectionCard>
    </>
  );
}
