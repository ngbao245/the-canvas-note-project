import type { Camera } from '../types';
import type { Bounds } from './camera';

// ============================================================
// Giới hạn pan — 3 lớp (spec `canvas-pan-bounce`, bạn chốt 2026-10-16)
//
//   1. Vùng tài liệu (canvas-space): khung bao object nới DOC_PAD_* mỗi phía.
//      Engine giữ hợp các vùng đã gặp trong phiên board → chỉ giãn, không co.
//   2. Phạm vi camera (px màn): tính lúc dùng từ tài liệu × zoom + cỡ màn
//      (`axisRange`). Không còn khoảng thở tĩnh, kéo lố thay chỗ đó.
//   3. Kéo lố: chỉ là phần vẽ lúc đang kéo / lăn, có lực cản + trần
//      (`rubberBand`). Không ghi vào tài liệu, không lưu.
// ============================================================

/**
 * Khoảng dư tính từ object xa nhất mỗi phía, đơn vị canvas (không đổi theo zoom).
 * Số gốc từ Milanote (MCP 2026-10-15): phải + 500, dưới + 400. Áp đủ 4 phía để
 * object ở rìa nào cũng có khoảng dư (bạn chốt 2026-10-15).
 */
export const DOC_PAD_LEFT = 500;
export const DOC_PAD_TOP = 400;
export const DOC_PAD_RIGHT = 500;
export const DOC_PAD_BOTTOM = 400;

/**
 * Trần an toàn toạ độ tài liệu (canvas-space, tính từ gốc). Tài liệu giãn theo
 * object đang kéo + tự cuộn ở mép → không có trần thì kéo giữ ở mép là đi mãi.
 * Số Kiro tự chọn (chưa đo), đổi được.
 */
export const DOC_COORD_LIMIT = 100_000;

/** Kéo lố tối đa mỗi trục: 15% màn, không quá 120px (bạn chốt 3A). */
const OVERSCROLL_RATIO = 0.15;
export const OVERSCROLL_MAX_PX = 120;

/** Độ nặng tay của kéo lố: nhỏ hơn → nặng hơn. */
const RUBBER_K = 0.55;

/** Board trống: coi như 1 điểm ở gốc, tài liệu = 1000 × 800 quanh gốc (bạn chốt 1A). */
const EMPTY_CONTENT: Bounds = { x: 0, y: 0, width: 0, height: 0 };

/** Khung bao object → vùng tài liệu (nới DOC_PAD_*, cắt theo DOC_COORD_LIMIT). */
export function computeScrollRegion(rawContent: Bounds | null): Bounds {
  const content = rawContent ?? EMPTY_CONTENT;
  const left = clampCoord(content.x - DOC_PAD_LEFT);
  const top = clampCoord(content.y - DOC_PAD_TOP);
  const right = clampCoord(content.x + content.width + DOC_PAD_RIGHT);
  const bottom = clampCoord(content.y + content.height + DOC_PAD_BOTTOM);
  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function clampCoord(v: number): number {
  return Math.max(-DOC_COORD_LIMIT, Math.min(DOC_COORD_LIMIT, v));
}

/** Hợp 2 khung (khung nhỏ nhất chứa cả 2). */
export function sameBounds(a: Bounds, b: Bounds): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function unionBounds(a: Bounds, b: Bounds): Bounds {
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * Phạm vi camera 1 trục. screen = world × zoom + cam. Mép đầu tài liệu chạm 0
 * ↔ cam = a; mép cuối chạm view ↔ cam = b. Tài liệu × zoom to hơn màn: b < a
 * (màn đi trong tài liệu). Nhỏ hơn: a < b (tài liệu trôi trong màn, bạn chốt 2A).
 */
export function axisRange(
  start: number,
  size: number,
  zoom: number,
  view: number,
): [number, number] {
  // `+ 0` đổi -0 thành 0 (start = 0 cho -0).
  const a = -start * zoom + 0;
  const b = view - (start + size) * zoom + 0;
  return [Math.min(a, b), Math.max(a, b)];
}

/** Trần kéo lố cho 1 trục màn cỡ `view` px. */
export function overscrollLimit(view: number): number {
  return Math.max(0, Math.min(view * OVERSCROLL_RATIO, OVERSCROLL_MAX_PX));
}

/**
 * Lố thô `over` (px, ≥ 0) → lố vẽ ra. Tăng dần, càng kéo càng nặng, không bao
 * giờ chạm `limit`. Lố nhỏ gần như 1:1 với tay (đạo hàm tại 0 = RUBBER_K).
 */
export function rubberBand(over: number, limit: number): number {
  if (over <= 0 || limit <= 0) return 0;
  return limit * (1 - 1 / ((RUBBER_K * over) / limit + 1));
}

/** Ngược của `rubberBand`: lố đang vẽ → lố thô. Dùng khi bắt đầu kéo lúc camera còn lố. */
export function rubberBandInverse(shown: number, limit: number): number {
  if (shown <= 0 || limit <= 0) return 0;
  const s = Math.min(shown, limit * 0.999);
  return (limit / RUBBER_K) * (s / (limit - s));
}

function ranges(
  zoom: number,
  bounds: Bounds,
  viewport: { width: number; height: number },
): { x: [number, number]; y: [number, number] } {
  return {
    x: axisRange(bounds.x, bounds.width, zoom, viewport.width),
    y: axisRange(bounds.y, bounds.height, zoom, viewport.height),
  };
}

function hasViewport(viewport: { width: number; height: number }): boolean {
  return viewport.width > 0 && viewport.height > 0;
}

/** Chặn cứng camera vào phạm vi. Trả đúng object cũ nếu không đổi. */
export function clampCameraToBounds(
  camera: Camera,
  bounds: Bounds | null,
  viewport: { width: number; height: number },
): Camera {
  if (!bounds || !hasViewport(viewport)) return camera;
  const r = ranges(camera.zoom, bounds, viewport);
  const x = Math.max(r.x[0], Math.min(r.x[1], camera.x));
  const y = Math.max(r.y[0], Math.min(r.y[1], camera.y));
  if (x === camera.x && y === camera.y) return camera;
  return { zoom: camera.zoom, x, y };
}

type OverMap = (over: number, limit: number) => number;

/** Áp `map` lên phần lố ngoài phạm vi mỗi trục; trong phạm vi giữ nguyên. */
function mapOverscroll(
  camera: Camera,
  bounds: Bounds | null,
  viewport: { width: number; height: number },
  map: OverMap,
): Camera {
  if (!bounds || !hasViewport(viewport)) return camera;
  const r = ranges(camera.zoom, bounds, viewport);
  const axis = (v: number, [lo, hi]: [number, number], limit: number): number => {
    if (v < lo) return lo - map(lo - v, limit);
    if (v > hi) return hi + map(v - hi, limit);
    return v;
  };
  const x = axis(camera.x, r.x, overscrollLimit(viewport.width));
  const y = axis(camera.y, r.y, overscrollLimit(viewport.height));
  if (x === camera.x && y === camera.y) return camera;
  return { zoom: camera.zoom, x, y };
}

/** Vị trí thô (theo tay) → vị trí vẽ có kéo lố. Trong phạm vi thì giữ nguyên. */
export function softClampCamera(
  raw: Camera,
  bounds: Bounds | null,
  viewport: { width: number; height: number },
): Camera {
  return mapOverscroll(raw, bounds, viewport, rubberBand);
}

/** Ngược `softClampCamera`: vị trí đang vẽ → vị trí thô tương ứng. */
export function unsoftCamera(
  shown: Camera,
  bounds: Bounds | null,
  viewport: { width: number; height: number },
): Camera {
  return mapOverscroll(shown, bounds, viewport, rubberBandInverse);
}

/**
 * Điểm neo zoom in: chuột nằm trên 1 object → giữ nguyên chỗ chuột; chuột ở
 * chỗ trống → kéo về điểm gần nhất trên object gần chuột nhất. Board nhiều cụm
 * rời nhau, chuột ở khoảng trống giữa 2 cụm vẫn zoom vào cụm gần (Milanote),
 * không vào giữa khung bao chung. Không có object → giữ chỗ chuột.
 *
 * So khoảng cách ở canvas-space: zoom đều 2 trục nên thứ tự gần / xa y như trên màn.
 * O(n) mỗi nấc zoom, không đáng kể so với render.
 */
export function attractPointerToNearest(
  pointer: { x: number; y: number },
  camera: Camera,
  rects: readonly Bounds[],
): { x: number; y: number } {
  if (rects.length === 0) return pointer;
  const wx = (pointer.x - camera.x) / camera.zoom;
  const wy = (pointer.y - camera.y) / camera.zoom;
  let best: Bounds | null = null;
  let bestD2 = Infinity;
  for (const r of rects) {
    const dx = Math.max(r.x - wx, 0, wx - (r.x + r.width));
    const dy = Math.max(r.y - wy, 0, wy - (r.y + r.height));
    const d2 = dx * dx + dy * dy;
    if (d2 === 0) return pointer;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = r;
    }
  }
  if (!best) return pointer;
  const nx = Math.max(best.x, Math.min(best.x + best.width, wx));
  const ny = Math.max(best.y, Math.min(best.y + best.height, wy));
  return { x: nx * camera.zoom + camera.x, y: ny * camera.zoom + camera.y };
}
