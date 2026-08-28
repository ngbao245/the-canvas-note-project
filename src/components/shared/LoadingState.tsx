import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  variant?: 'inline' | 'skeleton' | 'default';
  label?: string;
  count?: number;
  compact?: boolean;
  className?: string;
}

export function LoadingState({
  variant = 'default',
  label = 'Đang tải...',
  count = 3,
  compact = false,
  className,
}: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <span className={cn('inline-flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {label}
      </span>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-md bg-muted"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-muted-foreground',
        compact ? 'py-4' : 'py-12',
        className,
      )}
      role="status"
    >
      <Loader2 className={cn('animate-spin', compact ? 'h-4 w-4' : 'h-6 w-6')} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
