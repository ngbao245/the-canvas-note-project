import type { Bounds } from './coord';

/**
 * Khớp vị trí khi thả object (Milanote parity).
 *
 * Chỉ so cùng loại cạnh: trái-trái, tâm-tâm, phải-phải (trục X) và trên-trên,
 * tâm-tâm, dưới-dưới (trục Y). Không so chéo, không vẽ đường gióng, luôn bật.
 * Mỗi trục lấy cặp lệch ít nhất dưới ngưỡng; không có thì khớp lưới.
 *
 * Pure: không đọc store, không đụng DOM. Caller lo lọc ứng viên (bỏ object
 * đang kéo, object trong Unsort, object ngoài màn hình) và đổi ngưỡng theo zoom.
 */

/** Ngưỡng hút tính theo pixel màn hình. Caller chia zoom để ra canvas-space. */
export const SNAP_THRESHOLD_PX = 6;

export interface SnapDelta {
  dx: number;
  dy: number;
}

/**
 * Bước lưới canvas-space. Thả ở chỗ không gần card nào thì góc trên-trái khớp
 * vào bội số của bước này. 4 = 1/8 khoảng chấm grid ở zoom 100% (GRID_BASE 32)
 * nên vẫn trùng chấm. Card lệch tối đa 2px so với chỗ thả. Bạn đã thử 16 và 8,
 * đều thấy nhảy xa, chốt 4. Lưới cố định theo canvas, không đổi theo zoom.
 */
export const SNAP_GRID = 4;

/** Độ dịch để `value` về bội số gần nhất của `step`. */
function gridDelta(value: number, step: number): number {
  return Math.round(value / step) * step - value;
}

/**
 * Tìm độ dịch nhỏ nhất trên 1 trục. `moving` và mỗi phần tử `targets` là bộ 3
 * [đầu, tâm, cuối] của trục đó; chỉ so cùng vị trí trong bộ. Không có cặp nào
 * dưới ngưỡng → null.
 */
function bestAxisDelta(
  moving: readonly [number, number, number],
  targets: ReadonlyArray<readonly [number, number, number]>,
  threshold: number,
): number | null {
  let best: number | null = null;
  let bestAbs = threshold;
  for (const t of targets) {
    for (let i = 0; i < 3; i++) {
      const delta = t[i] - moving[i];
      const abs = Math.abs(delta);
      if (abs < bestAbs) {
        bestAbs = abs;
        best = delta;
      }
    }
  }
  return best;
}

function axisX(r: Bounds): readonly [number, number, number] {
  return [r.x, r.x + r.width / 2, r.x + r.width];
}

function axisY(r: Bounds): readonly [number, number, number] {
  return [r.y, r.y + r.height / 2, r.y + r.height];
}

/**
 * Độ dịch cần cộng vào vị trí `moving` khi thả. Mỗi trục xét riêng:
 *   1. Có cạnh card khác dưới ngưỡng → khớp cạnh đó (ưu tiên).
 *   2. Không có → khớp lưới SNAP_GRID theo cạnh đầu (trái / trên).
 * Không có trường hợp đặt tự do.
 */
export function computeSnapDelta(moving: Bounds, others: Bounds[], threshold: number): SnapDelta {
  const xs = others.map(axisX);
  const ys = others.map(axisY);
  return {
    dx: bestAxisDelta(axisX(moving), xs, threshold) ?? gridDelta(moving.x, SNAP_GRID),
    dy: bestAxisDelta(axisY(moving), ys, threshold) ?? gridDelta(moving.y, SNAP_GRID),
  };
}
