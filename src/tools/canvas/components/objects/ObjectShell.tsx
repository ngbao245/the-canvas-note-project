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
 *   - ColorBar top 4px chỉ khi có màu (note chọn màu); không có màu mặc định
 *
 * HAND mode (drawably vẽ tay):
 *   - DrawablyCard vẽ nét ngoài SVG hand-drawn (drawably tự lo border/shadow)
 *   - ColorBar giống flat
 *
 * Khung KHÔNG overflow-hidden: nút Card Clipper nằm ngoài cạnh phải note.
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
  surfaceColor,
  inkColor,
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
  /** Màu nền (data, VD nền note). 'transparent' = không nền + không bóng. Thiếu → bg-card. */
  surfaceColor?: string | null;
  /** Màu chữ (data). Con đọc qua `var(--object-ink)`. Thiếu → chữ theme. */
  inkColor?: string | null;
  children: ReactNode;
}) {
  const style = useUiStyleStore((s) => s.style);
  // Thanh màu chỉ hiện khi có màu (note người dùng chọn màu, hoặc type truyền
  // class). Không có màu mặc định: bạn không muốn thanh xanh trên note trơn
  // (2026-10-14; trước đó `bg-primary/60` không ra CSS nên không thấy, sửa token
  // độ mờ ngày 10-13 làm nó hiện ra).
  const colorBarClass = colorBarStyle ? '' : (colorBar ?? '');
  const showColorBar = Boolean(colorBarStyle) || Boolean(colorBar);
  // Nền + mực theo data: đặt biến CSS để con (chữ note, lớp mờ cuối note) đọc,
  // không phải truyền màu xuống từng tầng.
  const transparent = surfaceColor === 'transparent';
  const surfaceVars: Record<string, string> = {};
  if (surfaceColor) surfaceVars['--object-surface'] = surfaceColor;
  if (inkColor) surfaceVars['--object-ink'] = inkColor;
  const surfaceStyle: CSSProperties = {
    ...surfaceVars,
    ...(surfaceColor ? { backgroundColor: surfaceColor } : null),
  };
  // Bo góc trên khớp card, thay cho overflow-hidden ở khung (khung phải để tràn:
  // nút Card Clipper nằm ngoài cạnh phải note).
  const colorBarEl = showColorBar ? (
    <div
      className={`absolute inset-x-0 top-0 h-1 rounded-t-sm ${colorBarClass}`}
      style={colorBarStyle}
      aria-hidden="true"
    />
  ) : null;

  if (variant === 'bare') {
    // Bare: không shell, không ring. Type dùng bare tự vẽ viền chọn quanh vùng
    // thân qua `<SelectionBox>` (registry `ownSelectionFrame`). Ring ở đây sẽ bọc
    // cả khung → viền đôi, sai vùng (Board: bọc luôn tên + "N cards").
    // Không overflow-hidden: viền + chấm QuickLine lấn ra ngoài vùng thân.
    return <div className="relative h-full w-full">{children}</div>;
  }

  if (style === 'hand') {
    // Hand mode: DrawablyCard làm khung ngoài. Selection ring áp lên wrapper
    // (bên ngoài DrawablyCard) để nét hand-drawn không bị wrap ring. Màu theo cài
    // đặt (`--canvas-selection`, index.css).
    const ringCls = selected
      ? 'ring-2 ring-[color:var(--canvas-selection)]'
      : editing
        ? 'ring-2 ring-[color:color-mix(in_srgb,var(--canvas-selection)_60%,transparent)]'
        : '';
    return (
      <div className={`relative h-full w-full ${ringCls ? `${ringCls} rounded-sm` : ''}`}>
        <DrawablyCard style={{ width: '100%', height: '100%' }}>
          <div className="relative h-full w-full" style={surfaceStyle}>
            {colorBarEl}
            {children}
          </div>
        </DrawablyCard>
      </div>
    );
  }

  // Flat mode: Milanote-style contrast shadow. Không gắn ring: boxShadow inline sẽ
  // đè (cùng thuộc tính), viền chọn thật do SelectionBox vẽ.
  return (
    <div
      className="relative h-full w-full rounded-sm bg-card shadow-elevation-1 transition-shadow duration-fast"
      style={{
        // Trong suốt: bỏ bóng, không thì thành khung xám lơ lửng.
        boxShadow: transparent
          ? 'none'
          : 'inset 0 0 0 1px var(--background), var(--shadow-elevation-1)',
        ...surfaceStyle,
      }}
    >
      {colorBarEl}
      {children}
    </div>
  );
}
