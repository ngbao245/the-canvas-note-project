import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store theme màu (trục màu). Mặc định dark.
 * Lưu localStorage key 'bibo-theme'. Lưu LỰA CHỌN của người dùng (có 'system'),
 * còn <html data-theme> luôn nhận theme thật (dark/light) qua useResolvedTheme.
 *
 * Cấu trúc mở cho nhiều theme: khi thêm 'purple' | 'cute'... chỉ cần mở rộng union
 * Theme và thêm khối [data-theme='...'] trong src/styles/index.css.
 */

export type Theme = 'dark' | 'light';
/** Lựa chọn trong Cài đặt. 'system' = theo dark/light của máy. */
export type ThemePreference = Theme | 'system';

export const DEFAULT_THEME: ThemePreference = 'dark';

interface ThemeState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  /** Đảo dark/light theo theme đang hiện (đang 'system' thì chốt về theme ngược lại). */
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: DEFAULT_THEME,
      setTheme: (theme) => set({ theme }),
      toggle: () => set({ theme: resolveTheme(get().theme) === 'dark' ? 'light' : 'dark' }),
    }),
    { name: 'bibo-theme' },
  ),
);

const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemTheme(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function subscribeSystemTheme(onChange: () => void): () => void {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

export function resolveTheme(pref: ThemePreference): Theme {
  return pref === 'system' ? systemTheme() : pref;
}

/** Theme thật đang áp dụng. Đang 'system' thì tự cập nhật khi máy đổi dark/light. */
export function useResolvedTheme(): Theme {
  const pref = useThemeStore((s) => s.theme);
  const sys = useSyncExternalStore(subscribeSystemTheme, systemTheme, () => 'dark' as const);
  return pref === 'system' ? sys : pref;
}

export function applyThemeAttr(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}
