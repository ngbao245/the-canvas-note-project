import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store theme màu (trục màu). Mặc định dark.
 * Lưu localStorage key 'bibo-theme'. Đồng bộ data-theme lên <html> qua applyThemeAttr.
 *
 * Cấu trúc mở cho nhiều theme: khi thêm 'purple' | 'cute'... chỉ cần mở rộng union
 * Theme và thêm khối [data-theme='...'] trong src/styles/index.css.
 */

export type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggle: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    { name: 'bibo-theme' },
  ),
);

export function applyThemeAttr(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}
