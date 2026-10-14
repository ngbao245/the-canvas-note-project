import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Kiểu bàn phím (Cài đặt → Ngôn ngữ và vùng). Spec `docs/legacy/specs/shortcuts/` US-9.
 * Lưu lựa chọn của user, không lưu kết quả detect: chọn `auto` thì máy nào cũng tự nhận lại.
 * Chỉ lưu localStorage máy này ('bibo-keyboard-platform'), không đồng bộ sang máy khác.
 *
 * Đọc platform đang dùng qua `getKeyboardPlatform()` / `useKeyboardPlatform()` ở `@/lib/shortcuts`.
 */

export type KeyboardPlatform = 'macos' | 'windows-linux';
export type KeyboardPlatformPref = 'auto' | KeyboardPlatform;

export const KEYBOARD_PLATFORM_PREFS: readonly KeyboardPlatformPref[] = [
  'auto',
  'macos',
  'windows-linux',
];

interface KeyboardPlatformState {
  pref: KeyboardPlatformPref;
  setPref: (pref: KeyboardPlatformPref) => void;
}

export const useKeyboardPlatformStore = create<KeyboardPlatformState>()(
  persist(
    (set) => ({
      pref: 'auto',
      setPref: (pref) => set({ pref }),
    }),
    { name: 'bibo-keyboard-platform' },
  ),
);
