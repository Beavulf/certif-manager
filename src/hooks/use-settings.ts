'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { QUERY_CONFIG } from '@/constants/query-config';
import { queryKeys } from '@/constants/query-keys';
import { getAuditLogsAction } from '@/server/actions/settings/get-audit-logs-action';
import {
  getPublicAppSettingsAction,
  getSettingsAction,
} from '@/server/actions/settings/get-settings-action';
import { updateAppSettingsAction } from '@/server/actions/settings/update-app-settings-action';
import { updateNotificationSettingsAction } from '@/server/actions/settings/update-notification-settings-action';
import {
  sendTestEmailAction,
  verifySmtpAction,
} from '@/server/actions/settings/test-smtp-action';
import type { SettingsBundle } from '@/types/settings-types';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  const err = error as { error?: string };
  return err.error ?? fallback;
}

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.publicApp });
      toast.success('Настройки сохранены');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Не удалось сохранить настройки'));
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
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      toast.success('Настройки уведомлений сохранены');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Не удалось сохранить уведомления'));
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
    onSuccess: () => toast.success('SMTP-соединение успешно'),
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Не удалось подключиться к SMTP'));
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
    onSuccess: () => toast.success('Тестовое письмо отправлено'),
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Не удалось отправить письмо'));
    },
  });
}

export function useAuditLogs(page: number, pageSize: number) {
  return useQuery({
    queryKey: queryKeys.settings.auditLogs(page, pageSize),
    queryFn: async () => {
      const result = await getAuditLogsAction({ page, pageSize });
      if (!result.success) throw result;
      return result.data!;
    },
    ...QUERY_CONFIG,
  });
}
