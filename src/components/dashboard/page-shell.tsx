import { cn } from '@/lib/utils';

type PageShellProps = {
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
};

export function PageShell({ children, wide = false, className }: PageShellProps) {
  return (
    <div className="bg-background">
      <div
        className={cn(
          'mx-auto w-full py-6',
          wide ? 'max-w-none px-6 xl:px-10' : 'max-w-7xl px-6',
          className,
        )}
      >
        <div className="space-y-5">{children}</div>
      </div>
    </div>
  );
}