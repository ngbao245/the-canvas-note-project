import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { DrawablyBadge } from 'drawably/react';
import { useUiStyleStore } from '@/stores/ui-style-store';

/**
 * Vỏ Badge chọn phong cách:
 *   hand -> DrawablyBadge (scribble/outline vẽ tay)
 *   flat -> span dạng chip theo token (chưa có shadcn Badge, tự dựng theo token)
 *
 * shadcn Badge chưa được cài trong app foundation; dùng span + class Tailwind theme token.
 */

type BadgeTone = 'default' | 'primary' | 'success' | 'warning' | 'destructive';

interface StyleBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  scribble?: boolean;
  children?: ReactNode;
}

const toneClass: Record<BadgeTone, string> = {
  default: 'bg-muted text-muted-foreground border-border',
  primary: 'bg-primary-soft text-primary border-primary/40',
  success: 'bg-success-soft text-success border-success/40',
  warning: 'bg-warning-soft text-warning border-warning/40',
  destructive: 'bg-destructive-soft text-destructive border-destructive/40',
};

export const Badge = forwardRef<HTMLSpanElement, StyleBadgeProps>(
  ({ tone = 'default', scribble, children, className, ...props }, ref) => {
    const style = useUiStyleStore((s) => s.style);

    if (style === 'hand') {
      return (
        <DrawablyBadge variant={scribble ? 'scribble' : undefined}>{children}</DrawablyBadge>
      );
    }

    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${toneClass[tone]} ${className ?? ''}`}
        {...props}
      >
        {children}
      </span>
    );
  },
);
Badge.displayName = 'Badge';
