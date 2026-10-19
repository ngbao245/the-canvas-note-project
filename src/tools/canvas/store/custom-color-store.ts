import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Màu tuỳ chỉnh đã chọn, dùng chung mọi loại object canvas (note, board): chỉnh ở
 * note thì qua board vẫn thấy. Hex mới nhất đầu, không trùng (không phân biệt hoa
 * thường), tối đa 1 hàng 5 ô của popup màu. Chỉ lưu nền: màu chữ / icon luôn tự
 * tính theo độ sáng nền (bạn chốt 2026-10-16, như Milanote).
 *
 * Riêng máy (localStorage 'bibo-custom-colors'): là bảng màu cá nhân, không phải dữ
 * liệu board nên không đồng bộ. Chỉ `CustomColorButton` ghi vào đây.
 */

const CUSTOM_MAX = 5;

interface CustomColorState {
  colors: string[];
  push: (hex: string) => void;
}

export const useCustomColorStore = create<CustomColorState>()(
  persist(
    (set) => ({
      colors: [],
      push: (hex) =>
        set((s) => ({
          colors: [hex, ...s.colors.filter((c) => c.toLowerCase() !== hex.toLowerCase())].slice(0, CUSTOM_MAX),
        })),
    }),
    {
      name: 'bibo-custom-colors',
      version: 2,
      // Bản 1 lưu { hex, ink } (màu chữ chọn tay, đã bỏ) → lấy lại hex.
      migrate: (persisted) => {
        const raw: unknown =
          typeof persisted === 'object' && persisted !== null && 'colors' in persisted
            ? persisted.colors
            : [];
        const colors = Array.isArray(raw)
          ? raw
              .map((c: unknown) =>
                typeof c === 'string'
                  ? c
                  : typeof c === 'object' && c !== null && 'hex' in c && typeof c.hex === 'string'
                    ? c.hex
                    : null,
              )
              .filter((c): c is string => c !== null)
          : [];
        return { colors } as CustomColorState;
      },
    },
  ),
);
