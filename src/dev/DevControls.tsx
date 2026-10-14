import type { ReactNode } from 'react';
import { FOCUS_RING } from '@/lib/focus-ring';

/**
 * Nút nhỏ dùng chung trong bảng dev. Chữ là mã công cụ dev, không qua bộ dịch.
 */

export function DevSegmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex overflow-hidden rounded-md border border-border text-[11px] font-medium"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`px-2 py-1 uppercase transition-colors duration-normal ${FOCUS_RING} ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function DevButton({
  children,
  onClick,
  disabled,
  tone = 'default',
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'primary' | 'destructive';
  ariaLabel?: string;
}) {
  const toneCls =
    tone === 'primary'
      ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
      : tone === 'destructive'
        ? 'border-destructive/50 text-destructive hover:bg-destructive/10'
        : 'border-border text-foreground hover:bg-muted';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors duration-normal disabled:opacity-50 ${FOCUS_RING} ${toneCls}`}
    >
      {children}
    </button>
  );
}

export function DevSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-border px-3 py-2.5 first:border-t-0">
      <h2 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
