import {
  useKeyboardPlatformStore,
  type KeyboardPlatform,
  type KeyboardPlatformPref,
} from '@/stores/keyboard-platform-store';

/**
 * Kiểu bàn phím đang dùng: quyết nhãn phím chính (⌘ hay Ctrl) và phím chính khi click.
 * Bắt phím không theo cái này: bộ điều phối nhận Ctrl hoặc Cmd như nhau.
 *
 * Platform hiệu lực = lựa chọn của user, hoặc kết quả detect nếu là `auto`.
 * Detect nhớ 1 lần (OS không đổi trong phiên). Lựa chọn đọc lại mỗi lần gọi, không nhớ.
 */

let detected: KeyboardPlatform | undefined;

/**
 * Nhận máy Apple (macOS, iPad, iPhone). Thứ tự: userAgentData.platform (Chromium mới) →
 * navigator.platform → userAgent (iPad đời mới báo platform "MacIntel", userAgent vẫn có
 * "Macintosh"). iPad tính là Apple để iPad gắn bàn phím cũng hiện ⌘.
 */
export function detectKeyboardPlatform(): KeyboardPlatform {
  if (detected !== undefined) return detected;
  if (typeof navigator === 'undefined') return (detected = 'windows-linux');
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || nav.platform || '';
  const apple =
    /mac|iphone|ipad|ipod/i.test(platform) || /Macintosh|iPhone|iPad|iPod/.test(nav.userAgent);
  detected = apple ? 'macos' : 'windows-linux';
  return detected;
}

function resolve(pref: KeyboardPlatformPref): KeyboardPlatform {
  // Giá trị lạ trong localStorage (sửa tay, bản cũ) → coi như auto.
  return pref === 'macos' || pref === 'windows-linux' ? pref : detectKeyboardPlatform();
}

/** Đọc lúc sự kiện xảy ra (handler phím / chuột). Không dùng trong render: không cập nhật khi đổi. */
export function getKeyboardPlatform(): KeyboardPlatform {
  return resolve(useKeyboardPlatformStore.getState().pref);
}

/** Dùng trong component hiện nhãn phím: đổi lựa chọn trong Cài đặt là render lại ngay. */
export function useKeyboardPlatform(): KeyboardPlatform {
  return resolve(useKeyboardPlatformStore((s) => s.pref));
}
