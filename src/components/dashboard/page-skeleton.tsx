import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

type SkeletonBlockProps = {
  className?: string;
  style?: CSSProperties;
};

function SkeletonBlock({ className, style }: SkeletonBlockProps) {
  return (
    <div
      style={style}
      className={cn('animate-pulse rounded-lg bg-muted', className)}
    />
  );
}

function HeaderSkeleton() {
  return (
    <header className="shrink-0 border-b border-border/70 bg-background/95 px-6 py-5">
      <div className="flex items-start justify-between gap-6">
        <div className="w-full max-w-xl space-y-2.5">
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="h-4 w-full max-w-md" />
        </div>
      </div>
    </header>
  );
}

type PageSkeletonProps = {
  variant?: 'dashboard' | 'table' | 'list' | 'form';
};

function rowDelay(rowIndex: number, colIndex?: number): CSSProperties {
  return { animationDelay: `${(rowIndex + (colIndex ?? 0)) * 40}ms` };
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-none px-6 py-6 xl:px-10" aria-hidden>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SkeletonBlock className="h-4 w-72" />
          <SkeletonBlock className="h-8 w-32" />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock
              key={index}
              className="h-[76px] rounded-xl"
              style={rowDelay(index)}
            />
          ))}
        </div>

        <section className="grid items-start gap-4 xl:grid-cols-[1.45fr_0.85fr] xl:gap-5">
          <div className="flex min-w-0 flex-col gap-4">
            <SkeletonBlock className="h-36 rounded-xl" style={rowDelay(1)} />
            <SkeletonBlock className="h-64 rounded-xl" style={rowDelay(2)} />
            <SkeletonBlock className="h-52 rounded-xl" style={rowDelay(3)} />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <SkeletonBlock className="h-40 rounded-xl" style={rowDelay(2)} />
            <SkeletonBlock className="h-72 rounded-xl" style={rowDelay(3)} />
          </div>
        </section>
      </div>
    </div>
  );
}

function TableSkeletonFull() {
  return (
    <div className="mx-auto w-full max-w-none px-6 py-6 xl:px-10" aria-hidden>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SkeletonBlock className="h-8 w-24 rounded-lg" />
        <SkeletonBlock className="h-8 w-24 rounded-lg" />
        <SkeletonBlock className="h-8 w-24 rounded-lg" />
        <SkeletonBlock className="ml-auto h-10 w-64 rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border/70">
        <div className="flex gap-3 border-b border-border/70 px-4 py-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-4 flex-1" style={rowDelay(index)} />
          ))}
        </div>
        {Array.from({ length: 9 }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-3 px-4 py-3">
            {Array.from({ length: 6 }).map((_, colIndex) => (
              <SkeletonBlock
                key={colIndex}
                className="h-9 flex-1"
                style={rowDelay(rowIndex, colIndex)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="mx-auto w-full max-w-none px-6 py-6 xl:px-10" aria-hidden>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock
              key={index}
              className="h-[64px] rounded-xl"
              style={rowDelay(index)}
            />
          ))}
        </div>
        <div className="overflow-hidden rounded-xl border border-border/70">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-border/60 px-4 py-3.5 last:border-b-0"
            >
              <SkeletonBlock className="size-9 shrink-0 rounded-full" style={rowDelay(index)} />
              <div className="flex-1 space-y-1.5">
                <SkeletonBlock className="h-3.5 w-1/3" style={rowDelay(index, 1)} />
                <SkeletonBlock className="h-3 w-1/2" style={rowDelay(index, 2)} />
              </div>
              <SkeletonBlock className="h-6 w-20 rounded-full" style={rowDelay(index, 1)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6" aria-hidden>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border/70 p-6"
            style={rowDelay(index)}
          >
            <SkeletonBlock className="mb-4 h-5 w-56" />
            <div className="grid gap-4 sm:grid-cols-2">
              <SkeletonBlock className="h-10" />
              <SkeletonBlock className="h-10" />
              <SkeletonBlock className="h-10" />
              <SkeletonBlock className="h-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({ variant = 'dashboard' }: PageSkeletonProps) {
  return (
    <div className="bg-background">
      <HeaderSkeleton />
      {variant === 'dashboard' && <DashboardSkeleton />}
      {variant === 'table' && <TableSkeletonFull />}
      {variant === 'list' && <ListSkeleton />}
      {variant === 'form' && <FormSkeleton />}
    </div>
  );
}
