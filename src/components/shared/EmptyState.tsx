import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * EmptyState — khi chưa có data hoặc filter/search không có kết quả.
 * icon: LucideIcon component
 * title: tiêu đề chính
 * description: mô tả 1 dòng
 * action: nút hành động (tuỳ chọn)
 * compact: dùng trong panel nhỏ, giảm padding và font
 */

interface EmptyStateProps {
  icon?: LucideIcon;
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
  compact,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'gap-2 py-6' : 'gap-3 py-14'
      } ${className}`}
    >
      {Icon ? (
        <Icon
          className={`text-muted-foreground ${compact ? 'h-6 w-6' : 'h-10 w-10'}`}
          strokeWidth={1.5}
        />
      ) : null}
      <div className={compact ? 'text-sm font-medium' : 'text-base font-semibold'}>{title}</div>
      {description ? (
        <p className={`max-w-sm text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
