'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { useMemo } from 'react';
import { getCertificatesByFindMany } from '@/server/actions/certificate/get-certificate-action';
import { queryKeys } from '@/constants/query-keys';
import deleteCertificateAction from '@/server/actions/certificate/delete-certificate-action';
import dayjs from '@/lib/dayjs-config';
import type { Certificate } from '@/generated/prisma/client';
import type { CertificatesWithIncludes } from '@/types/certificate-types';
import { QUERY_CONFIG } from '@/constants/query-config';
import { CertificateFields } from '@/types/certificate-types';
import uploadCertificateToEmployeeAction from '@/server/actions/certificate/upload-certificate-action';


export function useUploadCertificate(invalidate: boolean = true) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dataForm: FormData) => {
      const result = await uploadCertificateToEmployeeAction(dataForm);
      if (!result.success) {
        throw result;
      }
      return result;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.certificates.all });
      return data;
    },
    onSettled: async () => {
      if (invalidate) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all });
      }
    },
    retry: false,
  })
}

// получение списка сертификатов всех либо по фильтру переданному
const WITHOUT_FIELDS = [CertificateFields.id, CertificateFields.status, CertificateFields.certType, CertificateFields.employeeId]
const DEFAULT_FIELDS = Object.values(CertificateFields).filter(field=>
  !WITHOUT_FIELDS.includes(field)
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
      const result = await getCertificatesByFindMany({ where });
      if (!result.success) { throw result; }
      return result.data as CertificatesWithIncludes[];
    },
    placeholderData: keepPreviousData,
    initialData: hasFilter ? undefined : initialData,
    ...QUERY_CONFIG,
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