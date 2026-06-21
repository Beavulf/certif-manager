'use client'

import { cn } from "@/lib/utils"
import { Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react"


export function UploadInput({
  addFiles,
  acceptExtensions,
  maxSizeMb,
}: {
  addFiles: (files: FileList | File[]) => void;
  acceptExtensions: string[];
  maxSizeMb: number;
}) {
  const [isDragging, setIsDragging] = useState(false);
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

  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
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
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-3 text-center transition-colors',
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
          {acceptExtensions.join(', ')} — до {maxSizeMb} МБ каждый
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={acceptExtensions.join(',')}
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) {
            addFiles(e.target.files)
          }
          e.target.value = ''
        }}
      />
    </>
  )
}