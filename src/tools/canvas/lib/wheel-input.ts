/**
 * Phân loại sự kiện lăn: chuột (nấc to, cần trượt mượt) hay touchpad (delta nhỏ
 * theo ngón tay, áp thẳng). Pinch touchpad cũng ra 'touchpad' (kèm ctrlKey).
 *
 * Không nhận pinch bằng cách theo dõi phím Ctrl thật: cấm gắn keydown lên
 * window (`coding-style.md`), nên nhận theo delta + nhớ loại trong 1 cử chỉ.
 */

export type WheelKind = 'mouse' | 'touchpad';

/** |delta| dưới ngưỡng = touchpad. Chuột Chrome / Edge Windows gửi ±100 / ±120. */
export const TOUCHPAD_DELTA_MAX = 40;

/** Sự kiện cách nhau dưới quãng này coi như cùng 1 cử chỉ, giữ loại. */
export const WHEEL_GESTURE_GAP_MS = 120;

interface WheelLike {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
}

/** Nhìn riêng 1 sự kiện: có dấu hiệu touchpad không. */
export function looksLikeTouchpad(e: WheelLike): boolean {
  // Line / page mode (Firefox, chuột thường) luôn là chuột.
  if (e.deltaMode !== 0) return false;
  const main = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  if (main === 0) return false;
  if (!Number.isInteger(e.deltaX) || !Number.isInteger(e.deltaY)) return true;
  // Chuột thường chỉ có 1 trục; cả 2 trục cùng khác 0 là vuốt 2 ngón.
  if (e.deltaX !== 0 && e.deltaY !== 0) return true;
  return Math.abs(main) < TOUCHPAD_DELTA_MAX;
}

/**
 * Bộ phân loại có nhớ: trong 1 cử chỉ chỉ nâng chuột → touchpad, không hạ.
 * Vuốt nhanh có 1 sự kiện delta to tròn vẫn là touchpad, không nhảy nấc.
 */
export function createWheelClassifier(): (e: WheelLike, now: number) => WheelKind {
  let kind: WheelKind = 'mouse';
  let last = -Infinity;
  return (e, now) => {
    const sameGesture = now - last < WHEEL_GESTURE_GAP_MS;
    last = now;
    const touch = looksLikeTouchpad(e);
    if (!sameGesture) kind = touch ? 'touchpad' : 'mouse';
    else if (touch) kind = 'touchpad';
    return kind;
  };
}
