'use client';

import { ConfigProvider, Popconfirm } from 'antd';
import {
  Download,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DOC_FILE_TYPES } from '@/constants/upload-config';
import {
  useCertificateDocuments,
  useDeleteCertificateDocument,
  useDownloadCertificateDocument,
  useUploadCertificateDocument,
} from '@/hooks/use-certificate-documents';
import dayjs from '@/lib/dayjs-config';
import { cn } from '@/lib/utils';
import type { Document } from '@/generated/prisma/client';

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMutationErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  const err = error as { error?: string };
  return err.error ?? 'Не удалось выполнить операцию';
}

const FILE_TYPE_LABELS = {
  pdf: 'PDF',
  doc: 'DOC',
  docx: 'DOCX',
} as const;

type CertificateDocumentsPanelProps = {
  certificateId: string;
  enabled?: boolean;
};

export function CertificateDocumentsPanel({
  certificateId,
  enabled = true,
}: CertificateDocumentsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: documents = [] as Document[], isPending, isError, refetch } =
    useCertificateDocuments(certificateId, enabled);
  const { mutateAsync: uploadDocument, isPending: isUploading } =
    useUploadCertificateDocument(certificateId);
  const { mutateAsync: deleteDocument, isPending: isDeleting } =
    useDeleteCertificateDocument(certificateId);
  const { mutateAsync: downloadDocument, isPending: isDownloading } =
    useDownloadCertificateDocument();

  const busy = isUploading || isDeleting || isDownloading;

  const handleUpload = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    try {
      await uploadDocument(file);
      toast.success('Документ загружен');
    } catch (error) {
      toast.error(getMutationErrorMessage(error));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      await downloadDocument(documentId);
    } catch (error) {
      toast.error(getMutationErrorMessage(error));
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await deleteDocument(documentId);
      toast.success('Документ удалён');
    } catch (error) {
      toast.error(getMutationErrorMessage(error));
    }
  };

  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Документы</h4>
          <span className="rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
            {documents.length}
          </span>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={DOC_FILE_TYPES.doc + DOC_FILE_TYPES.docx + DOC_FILE_TYPES.pdf}
            className="hidden"
            disabled={busy}
            onChange={(e) => handleUpload(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 cursor-pointer px-2.5"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            Прикрепить
          </Button>
        </div>
      </div>

      <div className="mt-2 space-y-1.5">
        {isPending && (
          <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Загрузка списка…
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
            Не удалось загрузить документы
            <Button
              type="button"
              variant="link"
              size="sm"
              className="ml-2 h-auto cursor-pointer p-0 text-xs"
              onClick={() => refetch()}
            >
              Повторить
            </Button>
          </div>
        )}

        {!isPending && !isError && documents.length === 0 && (
          <p className="rounded-lg border border-dashed border-border/80 px-3 py-2.5 text-xs text-muted-foreground">
            Нет прикреплённых файлов
          </p>
        )}

        {!isPending &&
          documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-accent/20 px-2.5 py-2"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-amber-700">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {doc.fileName}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {FILE_TYPE_LABELS[doc.fileType]} ·{' '}
                  {dayjs(doc.uploadedAt).format('DD.MM.YYYY HH:mm')}
                  {doc.fileSizeBytes
                    ? ` · ${formatFileSize(doc.fileSizeBytes)}`
                    : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Скачать документ"
                  disabled={busy}
                  onClick={() => handleDownload(doc.id)}
                  className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  <Download className="size-3.5" />
                </button>
                <ConfigProvider
                  theme={{
                    token: { colorPrimary: '#f59e0b', borderRadius: 10 },
                  }}
                >
                  <Popconfirm
                    title="Удалить документ?"
                    description={doc.fileName}
                    okText="Удалить"
                    cancelText="Отмена"
                    okButtonProps={{ danger: true, loading: isDeleting }}
                    onConfirm={() => handleDelete(doc.id)}
                  >
                    <span className="inline-flex">
                      <button
                        type="button"
                        aria-label="Удалить документ"
                        disabled={busy}
                        className={cn(
                          'inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50',
                        )}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  </Popconfirm>
                </ConfigProvider>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
