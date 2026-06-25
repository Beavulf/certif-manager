'use client'

import { useCallback, useRef, useState } from 'react'
import { Loader2, Square, Upload, X } from 'lucide-react'

import { showActionError, showActionSuccess, showValidationError } from '@/lib/toast-messages'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { EmployeeSelect } from '@/components/certificates/upload-dialog/employee-select'
import {
  getUploadErrorMessage,
  UploadFailuresDialog,
  type UploadFailure,
} from '@/components/certificates/upload-dialog/upload-failures-dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useUploadCertificate } from '@/hooks/use-certificate'
import { usePublicAppSettings } from '@/hooks/use-settings'
import {
  getUploadLimitsFromSettings,
  validateCertificateFile,
} from '@/lib/app-settings-helpers'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/constants/query-keys'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { UploadInput } from './upload-input'
import { UploadFileListItem } from './upload-file-list-item'

function validateFile(file: File, limits: ReturnType<typeof getUploadLimitsFromSettings>): string | null {
  return validateCertificateFile(file, limits)
}

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`
}

type UploadDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

export function UploadDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
}: UploadDialogProps = {}) {
  const queryClient = useQueryClient();
  const { data: appSettings } = usePublicAppSettings();
  const uploadLimits = appSettings
    ? getUploadLimitsFromSettings({
        maxFileSizeMb: appSettings.maxFileSizeMb,
        allowedCertTypes: appSettings.allowedCertTypes,
        allowedDocTypes: appSettings.allowedDocTypes,
      })
    : getUploadLimitsFromSettings(null);

  // invalidate: false - не инвалидировать кэш сертификатов
  const {mutateAsync: uploadCertificates, isPending: isUploading} = useUploadCertificate({
    invalidate: false
  });

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [files, setFiles] = useState<File[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadFailures, setUploadFailures] = useState<UploadFailure[]>([]);
  const [createEmployee, setCreateEmployee] = useState(true);
  const [successCount, setSuccessCount] = useState(0);
  const cancelRef = useRef(false);

  const resetForm = useCallback(() => {
    setFiles([])
    setEmployeeId('')
    setNotes('')
    setSuccessCount(0);
    setUploadFailures([])
    cancelRef.current = false;
  }, [])

  const onCancel = () => {
    cancelRef.current = true;
  }

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming)
    if (list.length === 0) return

    const valid: File[] = []
    for (const file of list) {
      const error = validateFile(file, uploadLimits)
      if (error) {
        showValidationError('Файл не прошёл проверку', `${file.name}: ${error}`)
        continue
      }
      valid.push(file)
    }

    if (valid.length === 0) return

    setFiles((prev) => {
      const existing = new Set(prev.map(fileKey))
      const next = [...prev]
      for (const file of valid) {
        const key = fileKey(file)
        if (!existing.has(key)) {
          existing.add(key)
          next.push(file)
        }
      }
      return next
    })
  }, [uploadLimits])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])
  
  const handleUpload = async () => {
    cancelRef.current = false;
    const trimmedEmployeeId = employeeId.trim()
    if (files.length === 0) {
      showValidationError(
        'Нет файлов для загрузки',
        'Добавьте хотя бы один файл сертификата (.cer или .p7b)',
      )
      return
    }

    const failed: UploadFailure[] = []
    const remainingFiles: File[] = []
    let uploadedCount = 0
    setSuccessCount(0)

    for (const file of files) {
      if (cancelRef.current) {
        showValidationError(
          'Загрузка прервана',
          `Загружено ${uploadedCount} из ${files.length} файлов до отмены`,
        )
        break;
      }
      const formData = new FormData()
      if (trimmedEmployeeId) {
        formData.append('employeeId', trimmedEmployeeId)
      }
      formData.append('file', file)
      if (notes.trim()) {
        formData.append('notes', notes.trim())
      }

      try {
        if (createEmployee && trimmedEmployeeId === '') {
          const result = await uploadCertificates({dataForm: formData, uploadSyncEmployee: true});
          if (!result.success) {
            throw result;
          }
        } else {
          const result = await uploadCertificates({dataForm: formData});
          if (!result.success) {
            throw result;
          }
        }
        queryClient.invalidateQueries({queryKey: queryKeys.certificates.all});
        if (createEmployee) {
          queryClient.invalidateQueries({queryKey: queryKeys.employees.all});
        }
        uploadedCount += 1
        setSuccessCount(uploadedCount)
      } catch (error) {
        failed.push({
          fileName: file.name,
          error: getUploadErrorMessage(error),
        })
        remainingFiles.push(file)
      }
    }

    if (uploadedCount > 0) {
      const label =
        uploadedCount === 1
          ? 'Сертификат загружен'
          : `Загружено сертификатов: ${uploadedCount}`

      showActionSuccess(
        label,
        failed.length > 0
          ? `С ошибками: ${failed.length}. Подробности — в диалоге ошибок`
          : undefined,
      )
    }

    if (failed.length > 0) {
      setUploadFailures(failed)
      const firstError = failed[0]?.error
      showActionError(
        { success: false, error: firstError ?? 'Ошибка обработки файла' },
        failed.length === 1
          ? `Загрузка файла ${failed[0].fileName}`
          : `Загрузка ${failed.length} файлов`,
        'Не удалось загрузить сертификат',
      )
    }

    if (failed.length === 0 && uploadedCount === files.length) {
      resetForm()
      setOpen(false)
    } else {
      setFiles(remainingFiles)
      setSuccessCount(0)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          resetForm()
          onCancel()
        }
      }}
    >
      {!hideTrigger ? (
        <DialogTrigger
          render={
            <Button className="cursor-pointer shrink-0">
              <Upload className="size-4" />
              Загрузить сертификат(ы)
            </Button>
          }
        />
      ) : null}
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Загрузка сертификатов</DialogTitle>
          <DialogDescription>
            Перетащите файлы в область ниже или выберите их на диске.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="upload-employee">Сотрудник</FieldLabel>
            <EmployeeSelect
              id="upload-employee"
              value={employeeId}
              onValueChange={setEmployeeId}
              disabled={isUploading}
            />
            <FieldDescription>
              Выберите сотрудника или оставьте «Без сотрудника», чтобы загрузить
              сертификат без привязки.
            </FieldDescription>
          </Field>

          <Field orientation="horizontal">
            <Label 
              htmlFor="create-employee" 
              className={cn("flex flex-col gap-1 w-full", isUploading || employeeId !== '' && "opacity-50")}>
              <p className="self-start">Автоматически создать или привязать сотрудника для сертификата?</p>
              <p className="text-xs text-muted-foreground">
                Если выбрано, то при загрузке сертификата, если сотрудник не найден, 
                то будет создан новый сотрудник с информацией подтягивающейся из AD. 
                Либо если сотрудник найден, но нет привязки сертификата, то будет 
                привязан сертификат.
              </p>
            </Label>
            <Checkbox
              disabled={isUploading || employeeId !== ''}
              className={cn("mt-1 cursor-pointer size-6 ml-auto", isUploading || employeeId !== '' && "cursor-not-allowed")}
              id="create-employee"
              checked={createEmployee}
              onCheckedChange={setCreateEmployee}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="upload-notes">Примечание</FieldLabel>
            <Input
              id="upload-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Необязательно"
              disabled={isUploading}
              maxLength={255}
            />
          </Field>

          <Field>
            <FieldLabel>Файлы сертификатов</FieldLabel>
            <UploadInput
              addFiles={addFiles}
              acceptExtensions={uploadLimits.allowedCertTypes}
              maxSizeMb={uploadLimits.maxFileSizeMb}
            />
          </Field>
     
          {files.length > 0 && (
            <ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-2">
              {files.map((file, index) => (
                <UploadFileListItem
                  key={fileKey(file)}
                  file={file}
                  index={index}
                  removeFile={removeFile}
                  isUploading={isUploading}
                />
              ))}
            </ul>
          )}
          {uploadFailures.length > 0 && (
            <UploadFailuresDialog failures={uploadFailures} />
          )}
        </FieldGroup>

        <DialogFooter className="items-center">
          <DialogClose
            render={
              <Button variant="outline" disabled={isUploading}>
                Отмена
              </Button>
            }
          />
          {isUploading ? (
            <Button
              title='Отменить загрузку'
              type="button"
              disabled={!isUploading}
              onClick={onCancel}
              className='cursor-pointer disabled:cursor-not-allowed'
            >
              <Loader2 className="size-4 animate-spin" />
              Загрузка… {successCount} из {files.length}
              <div className="flex items-center justify-center bg-red-500/20 rounded-full size-8 cursor-pointer hover:bg-red-500/30" onClick={onCancel}>
                <Square className="size-4" />
              </div>
            </Button>
          ):(
            <Button
              title='Загрузить сертификаты'
              type="button"
              disabled={files.length === 0 || isUploading}
              onClick={handleUpload}
              className='cursor-pointer disabled:cursor-not-allowed'
            >
              <Upload className="size-4" />
              {files.length > 1
                ? `Загрузить (${files.length})`
                : 'Загрузить'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
