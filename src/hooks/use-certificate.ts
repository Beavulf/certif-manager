'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { useMemo } from 'react';
import { getCertificatesByFindMany } from '@/server/actions/certificate/get-certificate-action';
import { toast } from 'sonner';
import { queryKeys } from '@/constants/query-keys';
import deleteCertificateAction from '@/server/actions/certificate/delete-certificate-action';

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

export function useGetCertificatesAll(filter?: string) {
  const [debouncedFilter] = useDebounce(filter, 400);

  const where = useMemo(() => (
    debouncedFilter
      ? {
          OR: [
            { serialNumber: { contains: debouncedFilter, mode: 'insensitive' } },
            { subjectCN: { contains: debouncedFilter, mode: 'insensitive' } },
            { subjectEmail: { contains: debouncedFilter, mode: 'insensitive' } },
            { uploadedBy: { contains: debouncedFilter, mode: 'insensitive' } }
          ]
        }
      : {}
  ), [debouncedFilter]);
  
  return useQuery({
    queryKey: queryKeys.certificates.list(debouncedFilter),
    queryFn: async () => {
      const result = await getCertificatesByFindMany({ where });

      if (!result.success) {
        throw result;
      }
      return result.data;
    },
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    retry: 1
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