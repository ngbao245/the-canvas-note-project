import type { DemoCamera, DemoRect } from './types';

// Toán camera thuần cho canvas mini. Viết lại, không import engine canvas thật
// (spec canvas-landing-demo: demo độc lập).
// Quy ước: điểm màn hình = điểm board × zoom + (x, y).

export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 2.5;

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Đổi zoom mà điểm board nằm dưới (screenX, screenY) vẫn đứng yên. */
export function zoomAroundPoint(
  camera: DemoCamera,
  screenX: number,
  screenY: number,
  nextZoom: number,
): DemoCamera {
  const zoom = clampZoom(nextZoom);
  const worldX = (screenX - camera.x) / camera.zoom;
  const worldY = (screenY - camera.y) / camera.zoom;
  return { x: screenX - worldX * zoom, y: screenY - worldY * zoom, zoom };
}

/** Điểm màn hình (tính từ góc trái trên của mặt canvas) → điểm board. */
export function screenToWorld(camera: DemoCamera, sx: number, sy: number): { x: number; y: number } {
  return { x: (sx - camera.x) / camera.zoom, y: (sy - camera.y) / camera.zoom };
}

export function boundsOf(rects: readonly DemoRect[]): DemoRect | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Camera căn giữa `rect` trong khung, không phóng quá 100% để chữ không to bất thường. */
export function fitRect(rect: DemoRect, viewW: number, viewH: number, padding: number): DemoCamera {
  const availW = Math.max(1, viewW - padding * 2);
  const availH = Math.max(1, viewH - padding * 2);
  const zoom = clampZoom(Math.min(1, availW / rect.w, availH / rect.h));
  return {
    x: (viewW - rect.w * zoom) / 2 - rect.x * zoom,
    y: (viewH - rect.h * zoom) / 2 - rect.y * zoom,
    zoom,
  };
}
