'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Loader2, UserRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useGetEmployees } from '@/hooks/use-employee'
import { cn } from '@/lib/utils'

const NO_EMPLOYEE_VALUE = ''

export type EmployeeSelectProps = {
  value: string
  onValueChange: (employeeId: string) => void
  disabled?: boolean
  id?: string
  className?: string
  /** Показывать пункт «Без сотрудника» (по умолчанию да) */
  allowEmpty?: boolean
}

function employeeSubtitle(employee: {
  email: string
  department: string | null
  adUsername: string | null
}): string {
  const parts = [
    employee.department,
    employee.adUsername,
    // employee.email,
  ].filter(Boolean)
  return parts.join(' · ')
}

export function EmployeeSelect({
  value,
  onValueChange,
  disabled = false,
  id,
  className,
  allowEmpty = true,
}: EmployeeSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const { data: employees = [], isLoading, isError } = useGetEmployees()

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === value),
    [employees, value]
  )

  const filteredEmployees = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((employee) => {
      const haystack = [
        employee.fullName,
        employee.email,
        employee.department ?? '',
        employee.adUsername ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [employees, query])

  const triggerLabel = selectedEmployee
    ? selectedEmployee.fullName
    : allowEmpty
      ? 'Без сотрудника'
      : 'Выберите сотрудника'

  function selectEmployee(employeeId: string) {
    onValueChange(employeeId)
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        render={(triggerProps) => (
          <Button
            {...triggerProps}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'h-11 w-full justify-between font-normal',
              !value && 'text-muted-foreground',
              className
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <UserRound className="size-4 shrink-0 opacity-70" />
              <span className="truncate">{triggerLabel}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        )}
      />

      <PopoverContent className="w-(--anchor-width) min-w-[320px] p-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по ФИО, email, отделу…"
          className="h-10"
          autoFocus
          autoComplete='asdasd'
        />

        <div className="mt-3 max-h-64 overflow-auto rounded-md border border-border/70">
          <div className="p-1">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => selectEmployee(NO_EMPLOYEE_VALUE)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent/50',
                  value === NO_EMPLOYEE_VALUE && 'bg-accent/50'
                )}
              >
                <Check
                  className={cn(
                    'size-4 shrink-0',
                    value === NO_EMPLOYEE_VALUE
                      ? 'opacity-100'
                      : 'opacity-0'
                  )}
                />
                <span className="text-muted-foreground">Без сотрудника</span>
              </button>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Загрузка списка…
              </div>
            ) : isError ? (
              <div className="py-8 text-center text-sm text-destructive">
                Не удалось загрузить сотрудников
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {employees.length === 0
                  ? 'Сотрудники не найдены'
                  : 'Ничего не найдено'}
              </div>
            ) : (
              filteredEmployees.map((employee) => {
                const selected = value === employee.id
                return (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => selectEmployee(employee.id)}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent/50',
                      selected && 'bg-accent/50'
                    )}
                  >
                    <Check
                      className={cn(
                        'mt-0.5 size-4 shrink-0',
                        selected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium leading-snug">
                        {employee.fullName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {employeeSubtitle(employee)}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
