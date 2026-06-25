import { cn } from '@/lib/utils';

const TONE_CLASSES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  neutral: 'border-border/70 bg-muted/50 text-muted-foreground',
  accent: 'border-amber-200 bg-amber-50 text-amber-800',
} as const;

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: keyof typeof TONE_CLASSES;
  className?: string;
};

export function StatusBadge({
  children,
  tone = 'neutral',
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
