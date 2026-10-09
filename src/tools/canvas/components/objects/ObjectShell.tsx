import type { CSSProperties, ReactNode } from 'react';
import { DrawablyCard } from 'drawably/react';
import { useUiStyleStore } from '@/stores/ui-style-store';

/**
 * ObjectShell — vỏ chung mọi object type, RESPECT design system 2-trục:
 *   - Trục THEME (màu): dark/light qua CSS token — auto.
 *   - Trục PHONG CÁCH: hand (drawably) / flat (Milanote-style) — qua useUiStyleStore.
 *
 * FLAT mode (Milanote parity):
 *   - Radius sm (6px), contrast shadow (elevation-1 + inset 1px outline bg-background)
 *   - ColorBar top 4px accent (default primary/60)
 *
 * HAND mode (drawably vẽ tay):
 *   - DrawablyCard vẽ nét ngoài SVG hand-drawn (drawably tự lo border/shadow)
 *   - ColorBar top vẫn giữ (thanh phẳng, không hand-drawn, đóng vai visual anchor)
 *   - Content bên trong dùng div overflow-hidden để clip ColorBar theo bounds
 *
 * `variant`:
 *   - 'card' — có nền + ColorBar + shell (Note, Link)
 *   - 'bare' — trong suốt, không ColorBar/shell (Image — ảnh tự fill)
 *
 * Content padding do renderer con lo (NoteObject dùng pl-5 pr-5 pb-5 pt-6).
 */
export function ObjectShell({
  selected,
  editing,
  variant = 'card',
  colorBar,
  colorBarStyle,
  children,
}: {
  selected: boolean;
  editing: boolean;
  variant?: 'card' | 'bare';
  /** Class Tailwind cho ColorBar top (data-driven qua theme token, VD 'bg-warning/70'). */
  colorBar?: string;
  /** Inline style cho ColorBar. Dùng khi color là DATA (user chọn hex tự do,
   *  ngoài palette theme). Ưu tiên hơn `colorBar` prop nếu có. Note color
   *  palette dùng path này qua `NoteData.color` (xem `lib/note-colors.ts`). */
  colorBarStyle?: CSSProperties;
  children: ReactNode;
}) {
  const style = useUiStyleStore((s) => s.style);
  // Nếu có inline style → skip class fallback (tránh conflict background). Else
  // dùng class prop hoặc default primary/60 theme-aware.
  const colorBarClass = colorBarStyle ? '' : (colorBar ?? 'bg-primary/60');

  if (variant === 'bare') {
    // Bare: không shell, không ring. Type dùng bare tự vẽ viền chọn quanh vùng
    // thân qua `<SelectionBox>` (registry `ownSelectionFrame`). Ring ở đây sẽ bọc
    // cả khung → viền đôi, sai vùng (Board: bọc luôn tên + "N cards").
    // Không overflow-hidden: viền + chấm QuickLine lấn ra ngoài vùng thân.
    return <div className="relative h-full w-full">{children}</div>;
  }

  if (style === 'hand') {
    // Hand mode: DrawablyCard làm khung ngoài. Selection ring áp lên wrapper
    // (bên ngoài DrawablyCard) để nét hand-drawn không bị wrap ring.
    return (
      <div
        className={`relative h-full w-full ${
          selected ? 'ring-2 ring-primary rounded-sm' : editing ? 'ring-2 ring-primary/60 rounded-sm' : ''
        }`}
      >
        <DrawablyCard style={{ width: '100%', height: '100%' }}>
          <div className="relative h-full w-full overflow-hidden">
            <div
              className={`absolute inset-x-0 top-0 h-1 ${colorBarClass}`}
              style={colorBarStyle}
              aria-hidden="true"
            />
            {children}
          </div>
        </DrawablyCard>
      </div>
    );
  }

  // Flat mode: Milanote-style contrast shadow + ColorBar (default hiện tại).
  const ringCls = selected
    ? 'ring-2 ring-primary'
    : editing
      ? 'ring-2 ring-primary/60'
      : '';

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-sm bg-card shadow-elevation-1 transition-shadow duration-fast ${ringCls}`}
      style={{
        boxShadow: 'inset 0 0 0 1px var(--background), var(--shadow-elevation-1)',
      }}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 ${colorBarClass}`}
        style={colorBarStyle}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
