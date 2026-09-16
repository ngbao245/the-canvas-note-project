import { Loader2 } from 'lucide-react';
import { Skeleton } from './Skeleton';

/**
 * LoadingState — trạng thái chờ dùng chung.
 * Variants:
 *   skeleton (mặc định): grid các skeleton block, dùng khi chờ danh sách
 *   inline: spinner nhỏ + label, dùng trong button đang mutate hoặc dòng chờ ngắn
 *   default: spinner center + label, dùng cho Suspense fallback full-page
 *
 * Khi biết footprint content, prefer skeleton match cấu trúc thật thay vì variant chung.
 */

interface LoadingStateProps {
  variant?: 'default' | 'skeleton' | 'inline';
  label?: string;
  count?: number;
  className?: string;
}

export function LoadingState({
  variant = 'default',
  label = 'Đang tải...',
  count = 6,
  className = '',
}: LoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span
        className={`inline-flex items-center gap-2 text-sm text-muted-foreground ${className}`}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {label}
      </span>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 ${className}`}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
