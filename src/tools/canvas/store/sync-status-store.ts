import { create } from 'zustand';

/**
 * Trạng thái đồng bộ server (spec `canvas-outbox` US-7), hiện cạnh "Đã lưu" ở hàng tiêu đề.
 * Chỉ có giá trị khi outbox chạy (dev). Bản build luôn `idle` → giữ trạng thái lưu như cũ.
 *   - local: còn mục chờ gửi ("Đã lưu trên máy")
 *   - synced: hết mục chờ ("Đã đồng bộ"), hiện 2s rồi về idle
 *   - unsynced: offline hoặc đang chờ thử lại sau lỗi ("Chưa đồng bộ"), giữ tới khi gửi được
 */

export type SyncStatusPhase = 'idle' | 'local' | 'synced' | 'unsynced';

const SYNCED_VISIBLE_MS = 2000;

export const useSyncStatusStore = create<{ phase: SyncStatusPhase }>(() => ({ phase: 'idle' }));

let hideTimer: ReturnType<typeof setTimeout> | undefined;

export function setSyncPhase(phase: Exclude<SyncStatusPhase, 'idle'>): void {
  clearTimeout(hideTimer);
  useSyncStatusStore.setState({ phase });
  if (phase === 'synced') {
    hideTimer = setTimeout(() => useSyncStatusStore.setState({ phase: 'idle' }), SYNCED_VISIBLE_MS);
  }
}
