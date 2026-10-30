import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Skeleton block với shimmer nhẹ. Dùng để match footprint content thật khi chờ data.
 * Rule: khi async chờ data, ưu tiên skeleton match layout thay vì spinner tròn.
 * Đặt kích thước bằng class Tailwind (h-*, w-*) từ nơi dùng.
 */
export const Skeleton = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      // Vệt sáng là vòng lặp trang trí: giảm chuyển động thì đứng yên (motion.css).
      data-motion-loop
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer',
        'before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent',
        className,
      )}
      {...props}
    />
  ),
);
Skeleton.displayName = 'Skeleton';
