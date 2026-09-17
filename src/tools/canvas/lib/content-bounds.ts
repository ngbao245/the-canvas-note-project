import { ZOOM_OUT_BASELINE, type CanvasObject } from '../types';
import { computeFitZoom, type Bounds } from '../engine/camera';

/**
 * Tính AABB bao toàn bộ object trên board. Null nếu không có object.
 * Trong canvas-space.
 */
export function computeContentBounds(objects: Iterable<CanvasObject>): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let has = false;
  for (const o of objects) {
    has = true;
    const g = o.geometry;
    if (g.x < minX) minX = g.x;
    if (g.y < minY) minY = g.y;
    if (g.x + g.width > maxX) maxX = g.x + g.width;
    if (g.y + g.height > maxY) maxY = g.y + g.height;
  }
  if (!has) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Dynamic zoom min content-aware — Milanote parity.
 *
 * Rule: user luôn được zoom out tới ít nhất `ZOOM_OUT_BASELINE` (40%). Chỉ khi
 * content trải rộng và fit-zoom < 40%, min hạ xuống fit-zoom để cho phép thấy
 * hết. Content nhỏ gọn (fit-zoom > 40%) không được kéo min lên — user vẫn có
 * cảm giác "zoom out dư dả" giống Milanote.
 *
 *   Empty          → 0.4
 *   Fit-zoom 0.8   → min(0.4, 0.8) = 0.4     (content nhỏ gọn, giữ 40%)
 *   Fit-zoom 0.24  → min(0.4, 0.24) = 0.24   (content sparse, cho xa hơn)
 */
export function computeDynamicZoomMin(
  bounds: Bounds | null,
  viewport: { width: number; height: number },
): number {
  if (!bounds) return ZOOM_OUT_BASELINE;
  return Math.min(ZOOM_OUT_BASELINE, computeFitZoom(bounds, viewport));
}

/**
 * Pan bounds = content bounds + margin. Camera clamp để viewport center
 * luôn nằm trong bounds → không pan thoát khỏi content.
 * Empty → null (không clamp).
 */
export function computePanBounds(bounds: Bounds | null): Bounds | null {
  if (!bounds) return null;
  // Thêm margin 30% mỗi phía để user vẫn kéo ra chút không gian ngoài rìa.
  const marginX = bounds.width * 0.3;
  const marginY = bounds.height * 0.3;
  return {
    x: bounds.x - marginX,
    y: bounds.y - marginY,
    width: bounds.width + marginX * 2,
    height: bounds.height + marginY * 2,
  };
}
