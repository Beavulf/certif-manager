'use client';

import { useQuery } from '@tanstack/react-query';

import { QUERY_CONFIG } from '@/constants/query-config';
import { queryKeys } from '@/constants/query-keys';
import { getAssignableCertificatesForEmployeeAction } from '@/server/actions/certificate/get-assignable-certificates-action';

export function useAssignableCertificates(
  employeeId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.certificates.assignable(employeeId ?? ''),
    queryFn: async () => {
      if (!employeeId) return [];
      const result = await getAssignableCertificatesForEmployeeAction(employeeId);
      if (!result.success) {
        throw result;
      }
      return result.data;
    },
    enabled: enabled && Boolean(employeeId),
    ...QUERY_CONFIG,
  });
}
