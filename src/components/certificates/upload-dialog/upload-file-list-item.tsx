import { Button } from "@/components/ui/button"
import { FileBadge2, X } from "lucide-react"

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadFileListItem(
  {
    file, 
    index, 
    removeFile, 
    isUploading
  }: {
    file: File, 
    index: number, 
    removeFile: (index: number) => void, 
    isUploading: boolean
  }
) {
  return (
    <>
      <li
        key={`${file.name}-${file.size}-${file.lastModified}`}
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
    </>
  )
}