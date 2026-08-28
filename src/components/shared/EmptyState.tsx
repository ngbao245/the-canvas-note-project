import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 text-center',
        compact ? 'py-6' : 'py-12',
        className,
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            'text-muted-foreground',
            compact ? 'h-6 w-6' : 'h-10 w-10',
          )}
        />
      ) : null}
      <h3 className={cn('font-medium', compact ? 'text-sm' : 'text-base')}>{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
