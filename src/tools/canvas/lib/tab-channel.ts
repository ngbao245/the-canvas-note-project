// Kênh báo giữa các tab canvas cùng trình duyệt (BroadcastChannel).
// Tin không gửi lại cho chính tab gửi. Trình duyệt không có BroadcastChannel thì
// mọi hàm thành no-op: mỗi tab chạy riêng như trước.

export type TabMessage =
  /** Vừa ghi xong các object này xuống IndexedDB. Tab khác đọc lại. */
  | { type: 'objects'; puts: string[]; deletes: string[] }
  /** Có tab vừa giữ / nhả khoá sửa. Tab khác hỏi lại danh sách khoá. */
  | { type: 'locks' }
  /** Tab khác bấm "×" trên badge: tab đang sửa object `id` phải thoát sửa + nhả khoá. */
  | { type: 'release'; id: string };

const CHANNEL_NAME = 'bibo-canvas';

let channel: BroadcastChannel | null | undefined;

function getChannel(): BroadcastChannel | null {
  if (channel === undefined) {
    channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

export function postTabMessage(msg: TabMessage): void {
  getChannel()?.postMessage(msg);
}

export function onTabMessage(handler: (msg: TabMessage) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  const listener = (e: MessageEvent<unknown>) => {
    if (isTabMessage(e.data)) handler(e.data);
  };
  ch.addEventListener('message', listener);
  return () => ch.removeEventListener('message', listener);
}

function isTabMessage(data: unknown): data is TabMessage {
  if (typeof data !== 'object' || data === null || !('type' in data)) return false;
  if (data.type === 'locks') return true;
  if (data.type === 'release') return 'id' in data && typeof data.id === 'string';
  return (
    data.type === 'objects' &&
    'puts' in data &&
    'deletes' in data &&
    Array.isArray(data.puts) &&
    Array.isArray(data.deletes)
  );
}
