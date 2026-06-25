'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { useMemo } from 'react';
import { getCertificateByIdAction, getCertificatesByFindMany } from '@/server/actions/certificate/get-certificate-action';
import { queryKeys } from '@/constants/query-keys';
import deleteCertificateAction from '@/server/actions/certificate/delete-certificate-action';
import dayjs from '@/lib/dayjs-config';
import type { Certificate } from '@/generated/prisma/client';
import type { CertificatesWithIncludes } from '@/types/certificate-types';
import { QUERY_CONFIG } from '@/constants/query-config';
import { CertificateFields } from '@/types/certificate-types';
import uploadCertificateToEmployeeAction, { uploadCertificateAndSyncADUserAction } from '@/server/actions/certificate/upload-certificate-action';
import { updateCertificateEmployeeAction } from '@/server/actions/certificate/update-certificate-employee-action';
import { updateCertificateNotesAction } from '@/server/actions/certificate/update-certificate-notes-action';
import { revokeCertificateAction } from '@/server/actions/certificate/revoke-certificate-action';
import { getCertificateDownloadUrlAction } from '@/server/actions/certificate/get-certificate-download-url-action';
import { bulkDeleteCertificatesAction } from '@/server/actions/certificate/bulk-delete-certificates-action';

/**
 * Хук для загрузки сертификата сотрудника.
 *
 * @param {Object} params - Опции работы хука.
 * @param {boolean} [params.invalidate=true] - Инвалидировать кэш сертификатов после загрузки.
 * @param {boolean} [params.invalidateEmployee=false] - Инвалидировать кэш сотрудников после загрузки.
 *
 * @returns {UseMutationResult} - Объект мутации для загрузки сертификата (isPending, mutateAsync и др.).
 *
 * Пример:
 * const { mutateAsync, isPending } = useUploadCertificate({ invalidateEmployee: true });
 *
 * Детали:
 * - Если в dataForm.uploadSyncEmployee === true, используется uploadCertificateAndSyncADUserAction
 *   (загрузка сертификата с авто-созданием/синхронизацией сотрудника в AD).
 * - После успешной загрузки, если invalidate/invalidateEmployee === true, кэши сертификатов/сотрудников инвалидируются.
 * - В случае ошибки выбрасывается исключение с деталями ошибки.
 * - retry: false — повторных попыток по умолчанию нет.
 */

export function useUploadCertificate(
  { invalidate = true  }: 
  { invalidate?: boolean }
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      {dataForm, uploadSyncEmployee = false}: 
      {dataForm: FormData, uploadSyncEmployee?: boolean}
    ) => {
      if (uploadSyncEmployee) {
        const result = await uploadCertificateAndSyncADUserAction({formData: dataForm});
        if (!result.success) {
          throw result;
        }
        return result;
      }
      const result = await uploadCertificateToEmployeeAction(dataForm);
      if (!result.success) {
        throw result;
      }
      return result;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.certificates.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.all });
      return data;
    },
    onSettled: async () => {
      if (invalidate) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all });
        await queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      }
    },
    retry: false,
  })
}

// получение списка сертификатов всех либо по фильтру переданному
const WITHOUT_FIELDS = new Set<string>([
  CertificateFields.id,
  CertificateFields.status,
  CertificateFields.certType,
  CertificateFields.employeeId,
]);
const DEFAULT_FIELDS = Object.values(CertificateFields).filter(
  (field) => !WITHOUT_FIELDS.has(field),
);
export function useGetCertificatesAll(
  {
    filter,
    fields = DEFAULT_FIELDS,
    initialData
  }:
  {
    filter?: string,
    fields?: string[],
    initialData?: Certificate[]
  }
) {
  const [debouncedFilter] = useDebounce(filter?.trim(), 400);
  const hasFilter = Boolean(debouncedFilter);
  
  const where = useMemo(() => {
    if (!debouncedFilter || fields.length === 0) return {};
    return {
      OR: fields.filter(Boolean).map(field => {
        if (field === 'validFrom' || field === 'validTo' || field === 'uploadedAt') {
          const parsed = dayjs(debouncedFilter, 'DD.MM.YYYY', true);
          if (!parsed.isValid()) {
            return {};
          }
          const startOfDay = parsed.startOf('day').toDate();
          const endOfDay = parsed.endOf('day').toDate();
          return {
            [field]: {
              gte: startOfDay,
              lte: endOfDay,
            }
          };
        } else {
          return { [field]: { contains: debouncedFilter, mode: 'insensitive' as const } };
        }
      }).filter(Boolean)
    }
  }, [debouncedFilter, fields]);
  
  const finalQueryKey = useMemo(() => {
    if (!debouncedFilter || fields.length === 0) {
      return queryKeys.certificates.list();
    }
    return queryKeys.certificates.list([debouncedFilter, ...fields]);
  }, [debouncedFilter, fields]);

  return useQuery({
    queryKey: finalQueryKey,
    queryFn: async () => {
      const result = await getCertificatesByFindMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        include: {
          employee: { select: { id: true, fullName: true } },
          _count: { select: { documents: true } },
        },
      });
      if (!result.success) { throw result; }
      return result.data as CertificatesWithIncludes[];
    },
    placeholderData: keepPreviousData,
    initialData: hasFilter ? undefined : initialData,
    ...QUERY_CONFIG,
  });
}

export function useGetCertificateById(id: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.certificates.detail(id ?? ''),
    queryFn: async () => {
      if (!id) throw new Error('Идентификатор сертификата не указан');
      const result = await getCertificateByIdAction(id);
      if (!result.success) throw result;
      return result.data;
    },
    enabled: Boolean(id) && enabled,
    ...QUERY_CONFIG,
  });
}

export function useUpdateCertificateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      certificateId: string;
      employeeId: string | null;
    }) => {
      const result = await updateCertificateEmployeeAction(input);
      if (!result.success) throw result;
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.certificates.detail(variables.certificateId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      if (variables.employeeId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.employees.detail(variables.employeeId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.certificates.assignable(variables.employeeId),
        });
      }
    },
  });
}

export function useDeleteCertificate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteCertificateAction(id)
      if (!result.success) throw result;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all })
    },
  })
}

export function useBulkDeleteCertificates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const result = await bulkDeleteCertificatesAction(ids);
      if (!result.success) throw result;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all });
    },
  });
}

export function useUpdateCertificateNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { certificateId: string; notes: string | null }) => {
      const result = await updateCertificateNotesAction(input);
      if (!result.success) throw result;
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.certificates.detail(variables.certificateId),
      });
    },
  });
}

export function useRevokeCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (certificateId: string) => {
      const result = await revokeCertificateAction({ certificateId });
      if (!result.success) throw result;
      return result.data!;
    },
    onSuccess: (data) => {
      if (!data) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.certificates.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      if (data.employeeId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.employees.detail(data.employeeId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.certificates.assignable(data.employeeId),
        });
      }
    },
  });
}

export function useDownloadCertificate() {
  return useMutation({
    mutationFn: async (certificateId: string) => {
      const result = await getCertificateDownloadUrlAction(certificateId);
      if (!result.success) throw result;
      return result.data;
    },
  });
}