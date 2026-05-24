'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { useMemo } from 'react';
import { getCertificatesByFindMany } from '@/server/actions/certificate/get-certificate-action';
import { toast } from 'sonner';
import { queryKeys } from '@/constants/query-keys';
import deleteCertificateAction from '@/server/actions/certificate/delete-certificate-action';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { Certificate } from '@/generated/prisma/client';
import type { CertificatesWithIncludes } from '@/types/certificate-types';
import { QUERY_CONFIG } from '@/constants/query-config';

dayjs.extend(customParseFormat)
// dayjs.locale('ru');

export function useGetCertificates() {
  return useMutation({
    mutationFn: async (dataForm) => {
      const result = await getCertificatesByFindMany(dataForm);
      if (!result.success) {
        throw result
      }
      return result.data
    },
    onSuccess: (data) => {
      toast.success('Сертификат успешно загружен')
      // queryClient.invalidateQueries({ queryKey: ['certificates'] })
    },
    onError: (data) => {
      toast.error(data.error)
    }
  })
}

// получение списка сертификатов всех либо по фильтру переданному
const DEFAULT_FIELDS = ['serialNumber', 'subjectCN', 'subjectEmail', 'uploadedBy'];
export function useGetCertificatesAll(
  {
    filter,
    fields=DEFAULT_FIELDS,
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
        if (field === 'validFrom' || field === 'validTo') {
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
      if (!result.success) throw result  // бросаем SafeResult
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all })
      toast.success('Сертификат удалён')
    },
    onError: (error: { error: string; code?: string }) => {
      toast.error(error?.error ?? 'Ошибка при удалении')
    },
  })
}