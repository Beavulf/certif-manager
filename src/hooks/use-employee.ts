'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { QUERY_CONFIG } from '@/constants/query-config';
import { queryKeys } from '@/constants/query-keys';
import { appendEmployeeFormFields } from '@/lib/employee-form-utils';
import type { EmployeeListItem } from '@/lib/employee-table-utils';
import { createEmployeeAction } from '@/server/actions/employee/create-employee-action';
import { deleteEmployeeByIdAction } from '@/server/actions/employee/delete-employee-action';
import { getEmployeeDetailAction } from '@/server/actions/employee/get-employee-detail-action';
import { getEmployeesPageAction } from '@/server/actions/employee/get-employees-page-action';
import { getEmployeesAction } from '@/server/actions/employee/get-employees-action';
import { updateEmployeeByIdAction } from '@/server/actions/employee/update-employee-action';

export function useGetEmployees() {
  return useQuery({
    queryKey: queryKeys.employees.list(),
    queryFn: async () => {
      const result = await getEmployeesAction();
      if (!result.success) {
        throw result;
      }
      return result.data;
    },
    ...QUERY_CONFIG,
  });
}

export function useGetEmployeesPage(initialData?: EmployeeListItem[]) {
  return useQuery({
    queryKey: queryKeys.employees.page(),
    queryFn: async () => {
      const result = await getEmployeesPageAction();
      if (!result.success) {
        throw result;
      }
      return result.data;
    },
    initialData,
    ...QUERY_CONFIG,
  });
}

export function useGetEmployeeDetail(employeeId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.employees.detail(employeeId ?? ''),
    queryFn: async () => {
      if (!employeeId) return null;
      const result = await getEmployeeDetailAction(employeeId);
      if (!result.success) {
        throw result;
      }
      return result.data;
    },
    enabled: enabled && Boolean(employeeId),
    ...QUERY_CONFIG,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: {
      fullName: string;
      email: string;
      adUsername: string;
      department?: string;
      position?: string;
      isActive?: boolean;
    }) => {
      const formData = new FormData();
      appendEmployeeFormFields(formData, values);
      const result = await createEmployeeAction(formData);
      if (!result.success) {
        throw result;
      }
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      values,
    }: {
      employeeId: string;
      values: {
        fullName?: string;
        email?: string;
        adUsername?: string;
        department?: string;
        position?: string;
        isActive?: boolean;
      };
    }) => {
      const formData = new FormData();
      appendEmployeeFormFields(formData, {
        fullName: values.fullName ?? '',
        email: values.email ?? '',
        adUsername: values.adUsername ?? '',
        department: values.department,
        position: values.position,
        isActive: values.isActive,
      });
      const result = await updateEmployeeByIdAction(employeeId, formData);
      if (!result.success) {
        throw result;
      }
      return result.data;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.employees.detail(variables.employeeId),
      });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const result = await deleteEmployeeByIdAction(employeeId);
      if (!result.success) {
        throw result;
      }
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all });
    },
  });
}
