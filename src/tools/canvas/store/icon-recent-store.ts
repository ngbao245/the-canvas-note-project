import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Icon lucide dùng gần đây (spec canvas-board-icon), cho mục Gợi ý của popup icon.
 * Tên kebab-case, mới nhất đứng đầu, không trùng. Riêng máy này (localStorage
 * 'bibo-icon-recent'), không đồng bộ: là thói quen UI, không phải dữ liệu board.
 */

const RECENT_MAX = 12;

interface IconRecentState {
  names: string[];
  push: (name: string) => void;
}

export const useIconRecentStore = create<IconRecentState>()(
  persist(
    (set) => ({
      names: [],
      push: (name) =>
        set((s) => ({ names: [name, ...s.names.filter((n) => n !== name)].slice(0, RECENT_MAX) })),
    }),
    { name: 'bibo-icon-recent' },
  ),
);
