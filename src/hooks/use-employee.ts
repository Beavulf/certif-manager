'use client'

import { useQuery } from '@tanstack/react-query'

import { QUERY_CONFIG } from '@/constants/query-config'
import { queryKeys } from '@/constants/query-keys'
import { getEmployeesAction } from '@/server/actions/employee/get-employees-action'

export function useGetEmployees() {
  return useQuery({
    queryKey: queryKeys.employees.list(),
    queryFn: async () => {
      const result = await getEmployeesAction()
      if (!result.success) {
        throw result
      }
      return result.data
    },
    ...QUERY_CONFIG,
  })
}
