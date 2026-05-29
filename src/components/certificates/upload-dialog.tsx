'use client'

import { useCallback, useRef, useState } from 'react'
import { FileBadge2, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

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
import { EmployeeSelect } from '@/components/certificates/employee-select'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { UPLOAD_FILE_CONFIG as fileConfig } from '@/constants/upload-config'
import { useUploadCertificate } from '@/hooks/use-certificate'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/constants/query-keys'

function isCertificateFile(file: File): boolean {
  const lower = file.name.toLowerCase()
  return fileConfig.ARR_CERT_TYPE.some((ext) => lower.endsWith(ext))
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateFile(file: File): string | null {
  if (!isCertificateFile(file)) {
    return 'Допустимы только файлы .cer и .p7b'
  }
  if (file.size === 0) return 'Файл пустой'
  if (file.size > fileConfig.MAX_FILE_SIZE) return 'Файл превышает 10 МБ'
  return null
}

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`
}

export function UploadDialog() {
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient();
  const {mutateAsync: uploadCertificates, isPending: isUploading} = useUploadCertificate(false);

  const [open, setOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [notes, setNotes] = useState('')

  const resetForm = useCallback(() => {
    setFiles([])
    setEmployeeId('')
    setNotes('')
    setIsDragging(false)
  }, [])

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming)
    if (list.length === 0) return

    const valid: File[] = []
    for (const file of list) {
      const error = validateFile(file)
      if (error) {
        toast.error(`${file.name}: ${error}`)
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
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      if (e.dataTransfer.files?.length) {
        addFiles(e.dataTransfer.files)
      }
    },
    [addFiles]
  )

  const handleUpload = async () => {
    const trimmedEmployeeId = employeeId.trim()

    if (files.length === 0) {
      toast.error('Добавьте хотя бы один файл сертификата')
      return
    }

    let successCount = 0
    const failed: string[] = []
    const remainingFiles: File[] = []

    for (const file of files) {
      const formData = new FormData()
      if (trimmedEmployeeId) {
        formData.append('employeeId', trimmedEmployeeId)
      }
      formData.append('file', file)
      if (notes.trim()) {
        formData.append('notes', notes.trim())
      }

      try {
        await uploadCertificates(formData);
        queryClient.invalidateQueries({queryKey: queryKeys.certificates.all});
        successCount += 1;
      } catch (error) {
        if (error instanceof Error) {
          failed.push(`${file.name}: ${error.message}`)
          remainingFiles.push(file)
          continue
        }
        const fieldError = Object.values(error.fieldErrors ?? {});
        const message =
          fieldError.length > 0 ?
          fieldError[0] :
          (error.error ??
          'Не удалось загрузить файл')
          
        failed.push(`${file.name}: ${message}`)
        remainingFiles.push(file)
      }
    }

    if (successCount > 0) {
      const label =
        successCount === 1
          ? 'Сертификат успешно загружен'
          : `Загружено сертификатов: ${successCount}`
      toast.success(label)
    }

    for (const msg of failed) {
      toast.error(msg)
    }

    if (successCount === files.length) {
      resetForm()
      setOpen(false)
    } else if (successCount > 0) {
      setFiles(remainingFiles)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      <DialogTrigger
        render={
          <Button className="cursor-pointer shrink-0">
            <Upload className="size-4" />
            Загрузить сертификат(ы)
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Загрузка сертификатов</DialogTitle>
          <DialogDescription>
            Перетащите файлы в область ниже или выберите их на диске. Поддерживаются
            форматы .cer и .p7b, до 10 МБ каждый.
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
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  inputRef.current?.click()
                }
              }}
              onClick={() => inputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
                isDragging
                  ? 'border-amber-400 bg-amber-50/80 dark:bg-amber-950/30'
                  : 'border-border bg-muted/30 hover:border-amber-300 hover:bg-muted/50'
              )}
            >
              <div className="flex size-12 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
                <Upload className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Перетащите файлы сюда
                </p>
                <p className="text-xs text-muted-foreground">
                  или нажмите, чтобы выбрать на компьютере
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                .cer, .p7b — один или несколько файлов
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".cer,.p7b"
              multiple
              className="sr-only"
              disabled={isUploading}
              onChange={(e) => {
                if (e.target.files?.length) {
                  addFiles(e.target.files)
                }
                e.target.value = ''
              }}
            />
          </Field>
     
          {files.length > 0 && (
            <ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-2">
              {files.map((file, index) => (
                <li
                  key={fileKey(file)}
                  className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5 text-sm"
                >
                  <FileBadge2 className="size-4 shrink-0 text-amber-600" />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {file.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 cursor-pointer"
                    disabled={isUploading}
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                    aria-label={`Удалить ${file.name}`}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </FieldGroup>

        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" disabled={isUploading}>
                Отмена
              </Button>
            }
          />
          <Button
            type="button"
            disabled={isUploading || files.length === 0}
            onClick={handleUpload}
          >
            {isUploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Загрузка…
              </>
            ) : (
              <>
                <Upload className="size-4" />
                {files.length > 1
                  ? `Загрузить (${files.length})`
                  : 'Загрузить'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
