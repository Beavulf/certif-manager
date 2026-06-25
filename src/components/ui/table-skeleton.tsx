import { cn } from '@/lib/utils';

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
  className?: string;
};

export function TableSkeleton({
  rows = 8,
  columns = 6,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('space-y-2 p-4', className)} aria-hidden>
      <div className="mb-3 flex gap-3">
        {Array.from({ length: columns }).map((_, index) => (
          <div
            key={`head-${index}`}
            className="h-4 flex-1 animate-pulse rounded bg-muted"
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-10 flex-1 animate-pulse rounded-lg bg-muted/70"
              style={{ animationDelay: `${(rowIndex + colIndex) * 40}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
