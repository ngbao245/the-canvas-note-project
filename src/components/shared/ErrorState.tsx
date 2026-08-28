import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}

export function ErrorState({ message, onRetry, compact = false, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        compact ? 'py-4' : 'py-12',
        className,
      )}
      role="alert"
    >
      <AlertCircle
        className={cn('text-destructive', compact ? 'h-5 w-5' : 'h-8 w-8')}
      />
      <p className={cn('text-destructive', compact ? 'text-sm' : 'text-base')}>{message}</p>
      {onRetry ? (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Thử lại
        </Button>
      ) : null}
    </div>
  );
}
