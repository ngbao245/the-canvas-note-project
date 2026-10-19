import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Setting của Canvas do người dùng chỉnh trong Cài đặt → Canvas.
 * Lưu localStorage key 'bibo-canvas-settings', cả nhóm là 1 object → sau này
 * đồng bộ backend chỉ cần thay chỗ lưu.
 *
 * Hút cạnh / khớp lưới khi thả KHÔNG nằm ở đây: luôn bật (chốt 2026-10-02).
 */

export type ScrollSpeed = 'slow' | 'normal' | 'fast';

/** Hệ số nhân delta lăn CHUỘT khi cuộn canvas. 'normal' = 0.5, giữ như trước khi có setting. */
export const SCROLL_SPEED_FACTOR: Record<ScrollSpeed, number> = {
  slow: 0.3,
  normal: 0.5,
  fast: 0.8,
};

/** Hệ số cho TOUCHPAD 2 ngón: 'normal' = 1:1 theo tay (bạn chốt 2026-10-16). */
export const TOUCHPAD_SPEED_FACTOR: Record<ScrollSpeed, number> = {
  slow: 0.7,
  normal: 1,
  fast: 1.4,
};

/** Màu viền chọn object. 'contrast' = đen trên nền sáng, trắng trên nền tối. */
export type SelectionColor = 'contrast' | 'primary' | 'success' | 'warning';

const SELECTION_COLORS: readonly SelectionColor[] = ['contrast', 'primary', 'success', 'warning'];

/** Kiểu header canvas. 'bar' = 2 hàng phía trên (mặc định), 'islands' = đảo nổi, canvas tràn màn. */
export type HeaderStyle = 'bar' | 'islands';

interface CanvasSettings {
  showGrid: boolean;
  scrollSpeed: ScrollSpeed;
  selectionColor: SelectionColor;
  headerStyle: HeaderStyle;
}

const DEFAULTS: CanvasSettings = {
  showGrid: true,
  scrollSpeed: 'normal',
  selectionColor: 'contrast',
  headerStyle: 'bar',
};

interface CanvasSettingsState extends CanvasSettings {
  setShowGrid: (showGrid: boolean) => void;
  setScrollSpeed: (scrollSpeed: ScrollSpeed) => void;
  setSelectionColor: (selectionColor: SelectionColor) => void;
  setHeaderStyle: (headerStyle: HeaderStyle) => void;
  reset: () => void;
}

export const useCanvasSettingsStore = create<CanvasSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setShowGrid: (showGrid) => set({ showGrid }),
      setScrollSpeed: (scrollSpeed) => set({ scrollSpeed }),
      setSelectionColor: (selectionColor) => set({ selectionColor }),
      setHeaderStyle: (headerStyle) => set({ headerStyle }),
      reset: () => set(DEFAULTS),
    }),
    { name: 'bibo-canvas-settings' },
  ),
);

/** Kiểu header đang dùng. Giá trị lạ trong localStorage → 'bar'. */
export function useHeaderStyle(): HeaderStyle {
  const v = useCanvasSettingsStore((s) => s.headerStyle);
  return v === 'islands' ? 'islands' : 'bar';
}

/**
 * Gắn màu viền chọn lên <html data-canvas-selection> (CSS `--canvas-selection`
 * trong index.css). 'contrast' là mặc định của CSS nên gỡ thuộc tính. Giá trị lạ
 * trong localStorage → coi như mặc định.
 */
export function applySelectionColorAttr(color: SelectionColor): void {
  const el = document.documentElement;
  if (color === 'contrast' || !SELECTION_COLORS.includes(color)) {
    el.removeAttribute('data-canvas-selection');
  } else {
    el.setAttribute('data-canvas-selection', color);
  }
}
