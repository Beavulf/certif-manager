'use client';

import {
  AlertCircle,
  ChevronRight,
  FileBadge2,
  Loader2,
  Search,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { EmployeeDetailDialog } from '@/components/employees/employee-detail-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useGetEmployeesPage } from '@/hooks/use-employee';
import { usePublicAppSettings } from '@/hooks/use-settings';
import {
  DEFAULT_EXPIRY_THRESHOLDS,
  getExpiryUrgency,
  getUrgencyBadgeClass,
  URGENCY_LABELS,
  type ExpiryThresholds,
  type ExpiryUrgency,
} from '@/lib/certificate-expiry';
import {
  countActiveCertificates,
  filterEmployees,
  type EmployeeListItem,
} from '@/lib/employee-table-utils';
import { cn } from '@/lib/utils';

const MAX_RESULTS = 8;
const SUGGESTION_LIMIT = 5;

type DashboardEmployeeSearchProps = {
  initialEmployees?: EmployeeListItem[];
};

type EmployeeSearchRow = {
  employee: EmployeeListItem;
  certCount: number;
  activeCount: number;
  worstUrgency: ExpiryUrgency | null;
};

type PanelPosition = {
  top: number;
  left: number;
  width: number;
};

function buildEmployeeRow(
  employee: EmployeeListItem,
  thresholds: ExpiryThresholds = DEFAULT_EXPIRY_THRESHOLDS,
): EmployeeSearchRow {
  const certCount = employee.certificates.length;
  const activeCount = countActiveCertificates(employee.certificates);

  let worstUrgency: ExpiryUrgency | null = null;
  const urgencyRank: Record<ExpiryUrgency, number> = {
    revoked: 5,
    expired: 4,
    critical: 3,
    warning: 2,
    active: 1,
  };

  for (const cert of employee.certificates) {
    const urgency = getExpiryUrgency(cert, thresholds);
    if (!worstUrgency || urgencyRank[urgency] > urgencyRank[worstUrgency]) {
      worstUrgency = urgency;
    }
  }

  return { employee, certCount, activeCount, worstUrgency };
}

function urgencyNeedsAttention(urgency: ExpiryUrgency | null): boolean {
  return (
    urgency === 'critical' ||
    urgency === 'expired' ||
    urgency === 'warning' ||
    urgency === 'revoked'
  );
}

function EmployeeResultButton({
  row,
  onSelect,
  highlighted,
}: {
  row: EmployeeSearchRow;
  onSelect: (id: string) => void;
  highlighted?: boolean;
}) {
  const { employee, certCount, activeCount, worstUrgency } = row;
  const subtitle = [employee.department, employee.adUsername, employee.email]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(employee.id)}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border/70',
        'bg-background/80 px-3 py-2.5 text-left transition-all duration-150',
        'hover:border-amber-300/80 hover:bg-amber-50/80 hover:shadow-sm',
        highlighted && 'border-amber-300/80 bg-amber-50/80 shadow-sm',
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground transition-colors group-hover:border-amber-200 group-hover:bg-amber-100/80 group-hover:text-amber-800">
        <UserRound className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground group-hover:text-amber-950">
            {employee.fullName}
          </p>
          {!employee.isActive && (
            <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Неактивен
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {certCount === 0
            ? 'Нет привязанных сертификатов'
            : `Сертификатов: ${certCount} · активных: ${activeCount}`}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {certCount === 0 ? (
          <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            <AlertCircle className="size-3" />
            Нет сертификата
          </span>
        ) : worstUrgency ? (
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-medium',
              getUrgencyBadgeClass(worstUrgency),
            )}
          >
            {URGENCY_LABELS[worstUrgency]}
          </span>
        ) : null}
        <ChevronRight className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-700" />
      </div>
    </button>
  );
}

function SearchResultsPanel({
  position,
  panelRef,
  resultsTitle,
  visibleRows,
  trimmedQuery,
  filteredCount,
  highlightIndex,
  onSelect,
}: {
  position: PanelPosition;
  panelRef: React.RefObject<HTMLDivElement | null>;
  resultsTitle: string;
  visibleRows: EmployeeSearchRow[];
  trimmedQuery: string;
  filteredCount: number;
  highlightIndex: number;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      ref={panelRef}
      id="dashboard-employee-search-results"
      role="listbox"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 50,
      }}
      className="overflow-hidden rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10"
    >
      <div className="border-b border-border/70 bg-muted/30 px-4 py-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {resultsTitle}
        </p>
      </div>

      <div className="max-h-[min(360px,50vh)] space-y-1.5 overflow-y-auto p-2">
        {visibleRows.length === 0 ? (
          <div className="px-2 py-8 text-center text-sm text-muted-foreground">
            {trimmedQuery
              ? 'Сотрудники не найдены'
              : 'Нет сотрудников, требующих внимания'}
          </div>
        ) : (
          visibleRows.map((row, index) => (
            <EmployeeResultButton
              key={row.employee.id}
              row={row}
              onSelect={onSelect}
              highlighted={index === highlightIndex}
            />
          ))
        )}
      </div>

      {trimmedQuery && filteredCount >= MAX_RESULTS && (
        <div className="border-t border-border/70 bg-muted/20 px-4 py-2.5 text-center text-xs text-muted-foreground">
          Показаны первые {MAX_RESULTS} совпадений.{' '}
          <Link href="/employees" className="font-medium text-amber-800 hover:underline">
            Открыть полный список
          </Link>
        </div>
      )}
    </div>
  );
}

export function DashboardEmployeeSearch({
  initialEmployees,
}: DashboardEmployeeSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);

  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmedQuery = query.trim();

  const { data: employees = [], isPending } = useGetEmployeesPage(initialEmployees);
  const { data: appSettings } = usePublicAppSettings();
  const expiryThresholds = useMemo(
    () =>
      appSettings
        ? {
            warningDays: appSettings.warningDays,
            criticalDays: appSettings.criticalDays,
          }
        : DEFAULT_EXPIRY_THRESHOLDS,
    [appSettings],
  );

  const employeeRows = useMemo(
    () => employees.map((employee) => buildEmployeeRow(employee, expiryThresholds)),
    [employees, expiryThresholds],
  );

  const filteredRows = useMemo(() => {
    if (!trimmedQuery) return [];
    const filtered = filterEmployees(employees, trimmedQuery, 'all');
    return filtered
      .slice(0, MAX_RESULTS)
      .map((employee) => employeeRows.find((row) => row.employee.id === employee.id)!)
      .filter(Boolean);
  }, [employees, trimmedQuery, employeeRows]);

  const suggestionRows = useMemo(() => {
    if (trimmedQuery) return [];

    return employeeRows
      .filter(
        (row) =>
          row.certCount === 0 || urgencyNeedsAttention(row.worstUrgency),
      )
      .sort((a, b) => {
        const rank = (row: EmployeeSearchRow) => {
          if (row.certCount === 0) return 4;
          if (row.worstUrgency === 'expired') return 3;
          if (row.worstUrgency === 'critical') return 2;
          if (row.worstUrgency === 'warning') return 1;
          return 0;
        };
        return (
          rank(b) - rank(a) ||
          a.employee.fullName.localeCompare(b.employee.fullName, 'ru')
        );
      })
      .slice(0, SUGGESTION_LIMIT);
  }, [employeeRows, trimmedQuery]);

  const hasPanelContent = trimmedQuery.length > 0 || suggestionRows.length > 0;
  const panelOpen = open && hasPanelContent;
  const visibleRows = trimmedQuery ? filteredRows : suggestionRows;
  const resultsTitle = trimmedQuery
    ? `Результаты · ${filteredRows.length}`
    : 'Требуют внимания';

  const syncPanelPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    setPanelPosition({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!panelOpen) return;

    const handleReposition = () => syncPanelPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [panelOpen, syncPanelPosition]);

  useEffect(() => {
    if (!panelOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [panelOpen]);

  const openDetail = (id: string) => {
    setDetailEmployeeId(id);
    setDetailOpen(true);
    setOpen(false);
    setQuery('');
    setHighlightIndex(0);
    setPanelPosition(null);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!panelOpen || visibleRows.length === 0) {
      if (event.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % visibleRows.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + visibleRows.length) % visibleRows.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const row = visibleRows[highlightIndex];
      if (row) openDetail(row.employee.id);
    } else if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <>
      <EmployeeDetailDialog
        employeeId={detailEmployeeId}
        open={detailOpen}
        onOpenChange={(next) => {
          setDetailOpen(next);
          if (!next) setDetailEmployeeId(null);
        }}
      />

      <Card className="border-border/90 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Search className="size-4 text-amber-700" />
              <CardTitle className="text-base font-semibold">
                Быстрый поиск сотрудника
              </CardTitle>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              ФИО, email, отдел или логин AD — откройте карточку с сертификатами
            </p>
          </div>
          <Link
            href="/employees"
            className="shrink-0 text-xs font-medium text-amber-800 hover:underline"
          >
            Все сотрудники
          </Link>
        </CardHeader>

        <CardContent className="px-6 py-4">
          <div ref={anchorRef} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlightIndex(0);
                setOpen(true);
                syncPanelPosition();
              }}
              onFocus={() => {
                setOpen(true);
                syncPanelPosition();
              }}
              onKeyDown={handleKeyDown}
              type="search"
              role="combobox"
              aria-expanded={panelOpen}
              aria-controls="dashboard-employee-search-results"
              aria-autocomplete="list"
              placeholder="Начните вводить имя, email или отдел…"
              className="h-11 w-full pl-9"
              autoComplete="off"
            />
            {isPending && (
              <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {!open && !trimmedQuery && suggestionRows.length > 0 && (
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <FileBadge2 className="mt-0.5 size-3.5 shrink-0 text-amber-700" />
              <span>
                {suggestionRows.length} сотрудник(ов) без сертификата или с
                истекающим сроком — нажмите на поле для быстрого доступа
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {panelOpen &&
        panelPosition &&
        typeof document !== 'undefined' &&
        createPortal(
          <SearchResultsPanel
            position={panelPosition}
            panelRef={panelRef}
            resultsTitle={resultsTitle}
            visibleRows={visibleRows}
            trimmedQuery={trimmedQuery}
            filteredCount={filteredRows.length}
            highlightIndex={highlightIndex}
            onSelect={openDetail}
          />,
          document.body,
        )}
    </>
  );
}
