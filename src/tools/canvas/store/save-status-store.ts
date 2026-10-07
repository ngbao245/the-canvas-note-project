import { create } from 'zustand';

/**
 * Trạng thái lưu cho chữ "Đang lưu… / Đã lưu / Lưu lỗi" ở hàng tiêu đề board.
 *
 * Repository bọc mỗi lần ghi qua `trackSave` (xem api.ts). Đếm số lần ghi đang
 * chờ; hết thì báo "Đã lưu" rồi tự ẩn.
 *   - "Đang lưu…" chỉ hiện nếu ghi lâu hơn SAVING_DELAY_MS. IndexedDB thường
 *     xong trong vài ms → không nháy chữ mỗi lần sửa.
 *   - "Lưu lỗi" giữ nguyên tới lần lưu thành công sau, để người dùng kịp thấy.
 */

export type SavePhase = 'idle' | 'saving' | 'saved' | 'error';

const SAVING_DELAY_MS = 300;
const SAVED_VISIBLE_MS = 2000;

export const useSaveStatusStore = create<{ phase: SavePhase }>(() => ({ phase: 'idle' }));

let pending = 0;
let failedInBatch = false;
let savingTimer: ReturnType<typeof setTimeout> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

const setPhase = (phase: SavePhase) => useSaveStatusStore.setState({ phase });

/** Theo dõi 1 lần ghi. Trả lại chính promise đó (lỗi vẫn ném ra như cũ). */
export function trackSave(write: Promise<void>): Promise<void> {
  pending++;
  clearTimeout(hideTimer);
  if (pending === 1) {
    clearTimeout(savingTimer);
    savingTimer = setTimeout(() => setPhase('saving'), SAVING_DELAY_MS);
  }
  return write.then(
    () => finish(false),
    (err: unknown) => {
      finish(true);
      throw err;
    },
  );
}

function finish(failed: boolean): void {
  pending--;
  if (failed) failedInBatch = true;
  if (pending > 0) return;

  clearTimeout(savingTimer);
  if (failedInBatch) {
    failedInBatch = false;
    setPhase('error');
    return;
  }
  setPhase('saved');
  hideTimer = setTimeout(() => setPhase('idle'), SAVED_VISIBLE_MS);
}
