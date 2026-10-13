import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store phong cách hiển thị (trục độc lập với theme màu).
 * - hand: vẽ tay (drawably)
 * - flat: phẳng (shadcn thuần theme token) — mặc định
 * Lưu localStorage. Đổi trong Cài đặt → Giao diện.
 */

export type UiStyle = 'hand' | 'flat';

export const DEFAULT_UI_STYLE: UiStyle = 'flat';

interface UiStyleState {
  style: UiStyle;
  setStyle: (style: UiStyle) => void;
  toggle: () => void;
}

export const useUiStyleStore = create<UiStyleState>()(
  persist(
    (set, get) => ({
      style: DEFAULT_UI_STYLE,
      setStyle: (style) => set({ style }),
      toggle: () => set({ style: get().style === 'hand' ? 'flat' : 'hand' }),
    }),
    { name: 'bibo-ui-style' },
  ),
);

/**
 * Đồng bộ dấu hiệu phong cách lên phần tử gốc để CSS/component đọc được.
 * Gọi ở nơi mount cao (App) qua useEffect + subscribe.
 */
export function applyUiStyleAttr(style: UiStyle): void {
  document.documentElement.setAttribute('data-ui-style', style);
}
