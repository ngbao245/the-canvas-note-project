import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Kích thước giao diện (Cài đặt → Giao diện). Học theo mục Interface của Milanote:
 * cả canvas (card, chữ, vị trí) + toolbar trái + panel Unsort cùng nhân 1 tỉ lệ.
 * Header canvas, menu tài khoản, modal Cài đặt cũng theo (bạn chọn 2026-10-06, khác Milanote).
 *
 * Thang (bạn chốt 2026-10-06): Vừa = 1.0 = cỡ như trước khi có setting, là mặc định.
 * Nhỏ / Lớn cách Vừa ~10%, cùng khoảng cách Milanote (0.8 / 0.9 / 1.0 quy về Vừa ≈ 0.89 / 1 / 1.11).
 *
 * Lưu localStorage key 'bibo-interface'.
 * Phím tắt Ctrl+Shift+< / > đổi 1 mức (useGlobalShortcuts, chạy toàn app).
 */

export type InterfaceSize = 'small' | 'medium' | 'large';

/** Thứ tự nhỏ → lớn, dùng cho phím tắt đổi 1 mức. */
export const INTERFACE_SIZES: readonly InterfaceSize[] = ['small', 'medium', 'large'];

export const INTERFACE_SCALE: Record<InterfaceSize, number> = {
  small: 0.9,
  medium: 1,
  large: 1.1,
};

export const DEFAULT_INTERFACE_SIZE: InterfaceSize = 'medium';

/** Tỉ lệ đang dùng (đọc trong React). Ngoài React dùng `getInterfaceScale()`. */
export function useInterfaceScale(): number {
  return INTERFACE_SCALE[useInterfaceStore((s) => s.size)];
}

/** Tỉ lệ đang dùng, đọc 1 lần (handler pointer, engine). */
export function getInterfaceScale(): number {
  return INTERFACE_SCALE[useInterfaceStore.getState().size];
}

interface InterfaceState {
  size: InterfaceSize;
  setSize: (size: InterfaceSize) => void;
  /** +1 to lên, -1 nhỏ đi. Đã ở đầu/cuối thì đứng yên. */
  stepSize: (dir: 1 | -1) => void;
}

export const useInterfaceStore = create<InterfaceState>()(
  persist(
    (set, get) => ({
      size: DEFAULT_INTERFACE_SIZE,
      setSize: (size) => set({ size }),
      stepSize: (dir) => {
        const i = INTERFACE_SIZES.indexOf(get().size);
        const next = INTERFACE_SIZES[Math.min(INTERFACE_SIZES.length - 1, Math.max(0, i + dir))];
        if (next !== get().size) set({ size: next });
      },
    }),
    { name: 'bibo-interface' },
  ),
);
