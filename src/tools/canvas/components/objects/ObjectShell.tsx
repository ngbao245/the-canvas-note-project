import type { ReactNode } from 'react';

/**
 * ObjectShell — vỏ chung mọi object type.
 *
 * Lo phần khung: nền, border, bo góc, shadow, selection state, overflow.
 * Content theo type render vào children (slot).
 *
 * KHÔNG lo: position (ObjectsLayer set left/top/width/height), pointer/drag
 * (ObjectsLayer wrap), resize handle (SelectionLayer riêng).
 *
 * `variant`:
 *   - 'card'  — có nền + border + shadow (Note, Link)
 *   - 'bare'  — trong suốt, không nền/border (Image — ảnh tự fill; hoặc content tự lo khung)
 */
export function ObjectShell({
  selected,
  editing,
  variant = 'card',
  children,
}: {
  selected: boolean;
  editing: boolean;
  variant?: 'card' | 'bare';
  children: ReactNode;
}) {
  const base = 'h-full w-full overflow-hidden rounded-md transition-colors duration-[60ms]';
  const cardCls = selected
    ? 'border border-primary bg-card'
    : editing
      ? 'border border-primary/60 bg-card'
      : 'border border-border bg-card hover:border-border/80';
  const bareCls = selected
    ? 'border border-primary'
    : 'border border-transparent';

  return (
    <div
      className={`${base} ${variant === 'card' ? cardCls : bareCls}`}
      style={variant === 'card' ? { boxShadow: 'var(--shadow, 0 1px 2px rgba(0,0,0,0.06))' } : undefined}
    >
      {children}
    </div>
  );
}
