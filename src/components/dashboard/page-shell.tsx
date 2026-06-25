import { cn } from '@/lib/utils';
import { AppBreadcrumbsInline } from '@/components/dashboard/app-breadcrumbs';

type PageShellProps = {
  children: React.ReactNode;
  wide?: boolean;
  fill?: boolean;
  className?: string;
};

export function PageShell({
  children,
  wide = false,
  fill = false,
  className,
}: PageShellProps) {
  return (
    <div
      className={cn(
        'bg-background',
        fill && 'flex min-h-0 flex-1 flex-col overflow-hidden',
      )}
    >
      <div
        className={cn(
          'mx-auto w-full py-6',
          wide ? 'max-w-none px-6 xl:px-10' : 'max-w-7xl px-6',
          fill && 'flex min-h-0 flex-1 flex-col',
          className,
        )}
      >
        {fill ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <AppBreadcrumbsInline />
            {children}
          </div>
        ) : (
          <div className="space-y-5">
            <AppBreadcrumbsInline />
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
