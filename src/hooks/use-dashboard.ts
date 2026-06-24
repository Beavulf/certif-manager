'use client';

import { useQuery } from '@tanstack/react-query';

import { QUERY_CONFIG } from '@/constants/query-config';
import { queryKeys } from '@/constants/query-keys';
import { getDashboardAction } from '@/server/actions/dashboard/get-dashboard-action';
import type { DashboardData } from '@/types/dashboard-types';

export function useDashboard(initialData?: DashboardData) {
  return useQuery({
    queryKey: queryKeys.dashboard.bundle(),
    queryFn: async () => {
      const result = await getDashboardAction();
      if (!result.success) {
        throw result;
      }
      return result.data;
    },
    initialData,
    ...QUERY_CONFIG,
  });
}
