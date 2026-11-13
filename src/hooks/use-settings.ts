'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { QUERY_CONFIG } from '@/constants/query-config';
import { queryKeys } from '@/constants/query-keys';
import { getAuditLogsAction } from '@/server/actions/settings/get-audit-logs-action';
import {
  getPublicAppSettingsAction,
  getSettingsAction,
} from '@/server/actions/settings/get-settings-action';
import { refreshSystemStatusAction } from '@/server/actions/settings/refresh-system-status-action';
import { updateAppSettingsAction } from '@/server/actions/settings/update-app-settings-action';
import { updateNotificationSettingsAction } from '@/server/actions/settings/update-notification-settings-action';
import {
  sendTestEmailAction,
  verifySmtpAction,
} from '@/server/actions/settings/test-smtp-action';
import type { SettingsBundle } from '@/types/settings-types';

import {
  showActionError,
  showActionSuccess,
} from '@/lib/toast-messages';

export function useSettings(initialData?: SettingsBundle) {
  return useQuery({
    queryKey: queryKeys.settings.bundle,
    queryFn: async () => {
      const result = await getSettingsAction();
      if (!result.success) throw result;
      return result.data!;
    },
    initialData,
    ...QUERY_CONFIG,
  });
}

export function usePublicAppSettings() {
  return useQuery({
    queryKey: queryKeys.settings.publicApp,
    queryFn: async () => {
      const result = await getPublicAppSettingsAction();
      if (!result.success) throw result;
      return result.data!;
    },
    ...QUERY_CONFIG,
  });
}

export function useUpdateAppSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: unknown) => {
      const result = await updateAppSettingsAction(input);
      if (!result.success) throw result;
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<SettingsBundle | undefined>(
        queryKeys.settings.bundle,
        (prev) =>
          prev
            ? {
                ...prev,
                app: data.app,
                systemStatus: data.systemStatus,
              }
            : prev,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.publicApp,
      });
      // Предупреждение про удаление записей — только когда срок хранения реально менялся.
      showActionSuccess(
        'Общие настройки сохранены',
        data.retentionChanged
          ? 'Изменения применены. Записи аудита старше нового срока хранения удалены.'
          : 'Изменения применены.',
      );
    },
    onError: (error) => {
      showActionError(error, 'Сохранение общих настроек', 'Не удалось сохранить настройки');
    },
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: unknown) => {
      const result = await updateNotificationSettingsAction(input);
      if (!result.success) throw result;
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<SettingsBundle | undefined>(
        queryKeys.settings.bundle,
        (prev) => (prev ? { ...prev, notification: data } : prev),
      );
      showActionSuccess(
        'Настройки уведомлений сохранены',
        data.isEnabled
          ? 'Автоматическая отправка писем включена'
          : 'Автоматическая отправка писем отключена — cron не будет отправлять письма',
      );
    },
    onError: (error) => {
      showActionError(error, 'Сохранение настроек уведомлений', 'Не удалось сохранить уведомления');
    },
  });
}

export function useVerifySmtp() {
  return useMutation({
    mutationFn: async (input?: unknown) => {
      const result = await verifySmtpAction(input);
      if (!result.success) throw result;
      return result.data;
    },
    onSuccess: () =>
      showActionSuccess(
        'Подключение к SMTP успешно',
        'Сервер принял соединение с указанными параметрами',
      ),
    onError: (error) => {
      showActionError(error, 'Проверка SMTP-соединения', 'Не удалось подключиться к SMTP');
    },
  });
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: async (input: { testEmail: string; settings?: unknown }) => {
      const result = await sendTestEmailAction(input);
      if (!result.success) throw result;
      return result.data;
    },
    onSuccess: (_data, variables) =>
      showActionSuccess(
        'Тестовое письмо отправлено',
        `Получатель: ${variables.testEmail}`,
      ),
    onError: (error) => {
      showActionError(error, 'Отправка тестового письма', 'Не удалось отправить письмо');
    },
  });
}

export type AuditLogsFilters = {
  action?: string;
  search?: string;
};

export function useAuditLogs(
  page: number,
  pageSize: number,
  filters: AuditLogsFilters = {},
) {
  return useQuery({
    queryKey: queryKeys.settings.auditLogs(page, pageSize, filters),
    queryFn: async () => {
      const result = await getAuditLogsAction({ page, pageSize, ...filters });
      if (!result.success) throw result;
      return result.data!;
    },
    ...QUERY_CONFIG,
  });
}

/** Свежие пробы БД/MinIO/cron по кнопке «Обновить» (в обход кэша статуса). */
export function useRefreshSystemStatus() {
  return useMutation({
    mutationFn: async () => {
      const result = await refreshSystemStatusAction();
      if (!result.success) throw result;
      return result.data!;
    },
    onError: (error) => {
      showActionError(error, 'Обновление состояния системы', 'Не удалось обновить статус');
    },
  });
}
