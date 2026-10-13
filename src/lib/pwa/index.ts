/**
 * Đăng ký service worker + trạng thái "có bản mới" (spec `app-offline`).
 *
 * Luồng: bản build mới deploy → service worker mới tải xong, nằm chờ → `needRefresh = true`
 * → thanh báo hiện. Người dùng bấm "Tải lại" → `applyUpdate()` kích hoạt bản mới, trang tải lại.
 * Không bấm thì app chạy bản cũ tới khi đóng hết tab (không tự tải lại giữa lúc gõ).
 *
 * Chỉ chạy ở bản build (`import.meta.env.PROD`). Dev không có service worker.
 */
import { create } from 'zustand';
import { registerSW } from 'virtual:pwa-register';

// Tab mở lâu thì tự hỏi bản mới định kỳ, ngoài lần hỏi khi quay lại tab.
const UPDATE_CHECK_MS = 60 * 60 * 1000;

// true = có bản mới đang chờ VÀ người dùng chưa bấm "Để sau" trong tab này.
export const usePwaStore = create<{ needRefresh: boolean }>(() => ({ needRefresh: false }));

let started = false;
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

export function registerPwa(): void {
  if (!import.meta.env.PROD || started || !('serviceWorker' in navigator)) return;
  started = true;

  updateSW = registerSW({
    onNeedRefresh() {
      usePwaStore.setState({ needRefresh: true });
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const check = () => {
        // Offline thì hỏi sẽ lỗi mạng, bỏ qua, lần sau hỏi lại.
        if (!navigator.onLine) return;
        registration.update().catch(() => undefined);
      };
      window.setInterval(check, UPDATE_CHECK_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
    onRegisterError(err: unknown) {
      console.warn('[pwa] đăng ký service worker lỗi', err);
    },
  });
}

/** Kích hoạt service worker mới rồi tải lại trang. */
export function applyUpdate(): void {
  void updateSW?.(true);
}

/**
 * Ẩn thanh báo trong tab này. Bản mới vẫn chờ: đóng hết tab app rồi mở lại mới
 * dùng bản mới. F5 không kích hoạt bản chờ, thanh báo hiện lại.
 */
export function dismissUpdate(): void {
  usePwaStore.setState({ needRefresh: false });
}
