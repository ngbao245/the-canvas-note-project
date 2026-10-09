/**
 * Con trỏ tạm thời trong lúc thao tác (kéo, pan, thả sai chỗ). Đè lên con trỏ
 * riêng của mọi phần tử con (`cursor-move`, `cursor-pointer`...) cho tới khi tắt.
 *
 * Cơ chế: gắn `data-cursor` lên phần tử gốc, CSS ở `src/styles/index.css` áp
 * `!important` cho gốc + mọi con. Mặc định gốc là `<html>` (toàn trang). Truyền
 * `target` khi chỉ muốn đè trong 1 vùng (VD giữ Space chỉ đổi con trỏ trên canvas).
 *
 * Gốc lồng nhau: thứ tự ưu tiên theo thứ tự rule trong CSS
 * (grab < grabbing < not-allowed), không theo gốc trong hay ngoài.
 */
export type CursorOverride = 'grab' | 'grabbing' | 'not-allowed';

export function setCursorOverride(
  value: CursorOverride | null,
  target: HTMLElement = document.documentElement,
): void {
  if (value) target.dataset.cursor = value;
  else delete target.dataset.cursor;
}
