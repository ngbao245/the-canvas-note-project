import { AlertCircle, RotateCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/**
 * ErrorState — khi query/mutation fail.
 * message: mô tả lỗi (thường lấy error.message)
 * onRetry: bấm retry, thường là refetch
 * compact: dùng inline hoặc trong panel nhỏ
 */

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}

export function ErrorState({ message, onRetry, compact, className = '' }: ErrorStateProps) {
  const { t } = useI18n();
  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive-soft px-3 py-2 text-xs text-destructive ${className}`}
      >
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="flex-1">{message}</span>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded p-1 hover:bg-destructive/10"
            aria-label={t('COMMON.RETRY')}
          >
            <RotateCw className="h-3 w-3" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`}
    >
      <AlertCircle className="h-10 w-10 text-destructive" strokeWidth={1.5} />
      <div className="text-base font-semibold">{t('COMMON.ERROR_TITLE')}</div>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted"
        >
          <RotateCw className="h-3.5 w-3.5" /> {t('COMMON.RETRY')}
        </button>
      ) : null}
    </div>
  );
}
