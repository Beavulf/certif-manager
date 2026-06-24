'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';

import { QUERY_CONFIG } from '@/constants/query-config';
import { queryKeys } from '@/constants/query-keys';
import { getNotificationLogsPageAction } from '@/server/actions/notifications/get-notification-logs-page-action';
import { runNotificationCheckAction } from '@/server/actions/notifications/run-notification-check-action';
import type {
  NotificationLogsQuery,
  RunNotificationCheckInput,
} from '@/schemas/notifications-schema';

import { showActionError, showNotificationCheckResult } from '@/lib/toast-messages';

export function useNotificationLogsPage(filters: NotificationLogsQuery) {
  const [debouncedSearch] = useDebounce(filters.search ?? '', 300);

  const queryFilters = {
    ...filters,
    search: debouncedSearch || undefined,
  };

  return useQuery({
    queryKey: queryKeys.notifications.page(queryFilters),
    queryFn: async () => {
      const result = await getNotificationLogsPageAction(queryFilters);
      if (!result.success) throw result;
      return result.data!;
    },
    ...QUERY_CONFIG,
  });
}

export function useRunNotificationCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RunNotificationCheckInput = {}) => {
      const result = await runNotificationCheckAction(input);
      if (!result.success) throw result;
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      showNotificationCheckResult(data);
    },
    onError: (error) => {
      showActionError(error, 'Ручной запуск проверки сертификатов', 'Не удалось запустить проверку');
    },
  });
}
