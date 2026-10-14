/**
 * Cấu hình outbox (spec `.kiro/specs/canvas-outbox/`).
 *
 * Chỉ bật ở dev (có server giả). Bản build chưa có server thật: ghi outbox chỉ dồn mãi.
 * `canvas-sync` đổi cờ này thành "đã đăng nhập + có cấu hình Supabase".
 */
export const OUTBOX_ENABLED = import.meta.env.DEV;

/** Cửa sổ gom (chốt 2026-10-13): gửi muộn nhất 1s sau thay đổi đầu, không chờ ngừng gõ. */
export const OUTBOX_WINDOW_MS = 1000;
/** Thử lại sau lỗi: 1s, 2s, 4s… tối đa 30s. */
export const OUTBOX_RETRY_BASE_MS = 1000;
export const OUTBOX_RETRY_MAX_MS = 30_000;
