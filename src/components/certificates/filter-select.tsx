'use client'

import { useMemo, useState } from "react"
import { Check, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type FilterFieldItem = { label: string; value: string }

export function FilterSelect({
  items,
  value,
  onValueChange,
  className,
}: {
  items: FilterFieldItem[]
  value: string[]
  onValueChange: (next: string[]) => void
  className?: string
}) {
  const [query, setQuery] = useState("")

  const selectedSet = useMemo(() => new Set(value), [value])

  const selectedLabels = useMemo(() => {
    if (value.length === 0) return []
    const map = new Map(items.map((i) => [i.value, i.label] as const))
    return value.map((v) => map.get(v) ?? v)
  }, [items, value])

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) || i.value.toLowerCase().includes(q)
    )
  }, [items, query])

  function toggleField(fieldValue: string) {
    if (selectedSet.has(fieldValue)) {
      onValueChange(value.filter((v) => v !== fieldValue))
    } else {
      onValueChange([...value, fieldValue])
    }
  }

  function clearAll() {
    onValueChange([])
  }

  return (
    <Popover>
      <PopoverTrigger
        render={(triggerProps) => (
          <Button
            {...triggerProps}
            type="button"
            variant="outline"
            className={cn(
              "h-11 gap-2",
              value.length > 0 && "border-primary/40 bg-primary/5",
              className
            )}
          >
            <SlidersHorizontal className="size-4" />
            Фильтры
            {value.length > 0 ? (
              <span className="ml-1 inline-flex items-center gap-1">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                  {value.length}
                </span>
              </span>
            ) : null}
          </Button>
        )}
      />

      <PopoverContent className="w-[360px] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium">Фильтровать поиск по полям</div>
        </div>

        <div className="mt-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти поле…"
            className="h-10"
          />
        </div>

        {value.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedLabels.slice(0, 4).map((label, idx) => (
              <span
                key={`${label}-${idx}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-1 text-xs text-foreground"
              >
                <Check className="size-3.5 text-muted-foreground" />
                <span className="max-w-56 truncate">{label}</span>
              </span>
            ))}
            {selectedLabels.length > 4 ? (
              <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                +{selectedLabels.length - 4}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="mt-2 text-xs text-muted-foreground">
            Ничего не выбрано — поиск будет идти по умолчанию.
          </div>
        )}

        <div className="mt-3 max-h-64 overflow-auto rounded-md border border-border/70">
          <div className="p-2">
            {filteredItems.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Ничего не найдено
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredItems.map((item) => {
                  const checked = selectedSet.has(item.value)
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => toggleField(item.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent/50",
                        checked && "bg-accent/50"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleField(item.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="flex-1">{item.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.value}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-9"
            onClick={clearAll}
            disabled={value.length === 0}
          >
            Очистить
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
