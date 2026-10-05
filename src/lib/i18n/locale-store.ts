import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FALLBACK_LOCALE, type Locale } from './messages';

/**
 * Store ngôn ngữ giao diện. Lưu localStorage key 'bibo-locale', cùng kiểu với 'bibo-theme'.
 * Chưa có lựa chọn đã lưu thì theo ngôn ngữ trình duyệt: bắt đầu bằng 'vi' → vi, còn lại → en.
 * Kết quả đoán không ghi xuống localStorage cho tới khi người dùng chọn trong Cài đặt.
 */

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return FALLBACK_LOCALE;
  return navigator.language.toLowerCase().startsWith('vi') ? 'vi' : FALLBACK_LOCALE;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: detectBrowserLocale(),
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'bibo-locale' },
  ),
);

export function applyLangAttr(locale: Locale): void {
  document.documentElement.setAttribute('lang', locale);
}
