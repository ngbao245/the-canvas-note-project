/**
 * Cầu nối api.ts → lớp gửi outbox. api.ts không import lớp gửi trực tiếp (lớp gửi
 * import api.ts → vòng), và lớp gửi chỉ nạp ở dev.
 *
 * Chưa ai nghe (lớp gửi chưa chạy) thì bỏ qua: lúc khởi động lớp gửi tự đọc outbox.
 */

type OutboxListener = (urgent: boolean) => void;

let listener: OutboxListener | null = null;

export function setOutboxListener(fn: OutboxListener | null): void {
  listener = fn;
}

/** Vừa ghi mục outbox xuống máy. `urgent`: gửi ngay, bỏ phần còn lại của cửa sổ gom. */
export function signalOutbox(urgent: boolean): void {
  listener?.(urgent);
}
