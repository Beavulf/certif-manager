'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, FileBadge2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { extractErrorDetails } from '@/lib/toast-messages'

export type UploadFailure = {
  fileName: string
  error: string
}

export function getUploadErrorMessage(error: unknown): string {
  const { message, code, fieldDetails } = extractErrorDetails(
    error,
    'Не удалось загрузить файл',
  )
  const parts = [message, fieldDetails, code].filter(Boolean)
  return parts.join(' · ')
}

function certificatesWord(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) return 'сертификат'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return 'сертификата'
  }
  return 'сертификатов'
}

type UploadFailuresDialogProps = {
  failures: UploadFailure[]
}

export function UploadFailuresDialog({ failures }: UploadFailuresDialogProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (failures.length > 0) {
      setOpen(true)
    }
  }, [failures])

  if (failures.length === 0) return null

  const count = failures.length

  return (
    <>
      {!open && (
        <Button
          type="button"
          variant="outline"
          className="w-full cursor-pointer border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          <AlertCircle className="size-4" />
          Показать ошибки ({count})
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl bg-amber-50">
          <DialogHeader>
            <DialogTitle>Ошибки загрузки</DialogTitle>
            <DialogDescription>
              Не удалось загрузить {count} {certificatesWord(count)}. Ниже список
              файлов и описание ошибок.
            </DialogDescription>
          </DialogHeader>

          <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-2">
            {failures.map((item) => (
              <li
                key={`${item.fileName}-${item.error}`}
                className="flex gap-3 rounded-md bg-background px-3 py-2.5 text-sm"
              >
                <FileBadge2 className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div className="min-w-0 flex-1 space-y-0">
                  <p className="truncate font-medium">{item.fileName}</p>
                  <pre className="text-destructive text-wrap">{item.error}</pre>
                </div>
              </li>
            ))}
          </ul>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setOpen(false)}
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
