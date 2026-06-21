'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { QUERY_CONFIG } from '@/constants/query-config';
import { queryKeys } from '@/constants/query-keys';
import { getDocumentsByCertIdAction } from '@/server/actions/documents/get-document-action';
import { getDocumentDownloadUrlAction } from '@/server/actions/documents/get-document-download-url-action';
import { deleteDocumentByIdAction } from '@/server/actions/documents/delete-document-action';
import uploadDocumentAction from '@/server/actions/documents/upload-document-action';
import { getNotificationLogsByCertificateAction } from '@/server/actions/notifications/get-notification-logs-action';

import type { Document } from '@/generated/prisma/client';

function downloadFromUrl(url: string, fileName: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener noreferrer';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function useCertificateDocuments(certificateId: string | null, enabled = true) {
  return useQuery<Document[]>({
    queryKey: queryKeys.documents.byCertificate(certificateId ?? ''),
    queryFn: async () => {
      if (!certificateId) throw new Error('Идентификатор сертификата не указан');
      const result = await getDocumentsByCertIdAction(certificateId);
      if (!result.success) throw result;
      return result.data;
    },
    enabled: Boolean(certificateId) && enabled,
    ...QUERY_CONFIG,
  });
}

export function useCertificateNotificationLogs(
  certificateId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.notifications.byCertificate(certificateId ?? ''),
    queryFn: async () => {
      if (!certificateId) throw new Error('Идентификатор сертификата не указан');
      const result = await getNotificationLogsByCertificateAction(certificateId);
      if (!result.success) throw result;
      return result.data;
    },
    enabled: Boolean(certificateId) && enabled,
    ...QUERY_CONFIG,
  });
}

export function useUploadCertificateDocument(certificateId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!certificateId) throw new Error('Идентификатор сертификата не указан');
      const formData = new FormData();
      formData.append('certificateId', certificateId);
      formData.append('file', file);
      const result = await uploadDocumentAction(formData);
      if (!result.success) throw result;
      return result.data;
    },
    onSuccess: () => {
      if (!certificateId) return;
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byCertificate(certificateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.certificates.detail(certificateId),
      });
    },
  });
}

export function useDeleteCertificateDocument(certificateId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const result = await deleteDocumentByIdAction(documentId);
      if (!result.success) throw result;
      return result.data;
    },
    onSuccess: () => {
      if (!certificateId) return;
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byCertificate(certificateId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.certificates.detail(certificateId),
      });
    },
  });
}

export function useDownloadCertificateDocument() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const result = await getDocumentDownloadUrlAction(documentId);
      if (!result.success) throw result;
      return result.data;
    },
    onSuccess: ({ url, fileName }) => {
      downloadFromUrl(url, fileName);
    },
  });
}
