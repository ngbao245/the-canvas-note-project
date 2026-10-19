// ============================================================
// Canvas — Camera math (pure)
// ============================================================
//
// Pure math cho camera. Không state. Store/Engine dùng.
// Zoom around point: sau khi zoom, điểm dưới cursor giữ nguyên vị trí world →
//   tính lại camera translate.
// ============================================================

import type { Camera } from '../types';
import { ZOOM_MIN, ZOOM_MAX } from '../types';
import type { Point, Bounds } from './coord';
import { screenToCanvas } from './coord';

/**
 * Clamp zoom vào range. min/max override cho dynamic content-aware min.
 */
export function clampZoom(
  zoom: number,
  min: number = ZOOM_MIN,
  max: number = ZOOM_MAX,
): number {
  return Math.max(min, Math.min(max, zoom));
}

/**
 * Zoom quanh 1 điểm screen. Điểm đó ở canvas-space giữ nguyên sau zoom.
 */
export function zoomAroundPoint(
  camera: Camera,
  pointer: Point,
  newZoom: number,
  min: number = ZOOM_MIN,
  max: number = ZOOM_MAX,
): Camera {
  const clamped = clampZoom(newZoom, min, max);
  if (clamped === camera.zoom) return camera;

  const before = screenToCanvas(pointer, camera);
  return {
    zoom: clamped,
    x: pointer.x - before.x * clamped,
    y: pointer.y - before.y * clamped,
  };
}

/**
 * Tìm điểm screen mà zoom quanh nó đưa `from` tới đúng `to` (cả x, y, zoom).
 * Từ: to.x = p·(1 − r) + from.x·r, với r = to.zoom / from.zoom.
 * Null khi zoom gần như không đổi (r ≈ 1, không có điểm neo hợp lý).
 */
export function solveZoomAnchor(from: Camera, to: Camera): Point | null {
  const r = to.zoom / from.zoom;
  if (Math.abs(Math.log2(r)) < 0.01) return null;
  return {
    x: (to.x - from.x * r) / (1 - r),
    y: (to.y - from.y * r) / (1 - r),
  };
}

/** Pan camera bằng delta screen. */
export function panBy(camera: Camera, delta: Point): Camera {
  return {
    ...camera,
    x: camera.x + delta.x,
    y: camera.y + delta.y,
  };
}

/** Reset về origin, zoom 1x. */
export function resetCamera(): Camera {
  return { x: 0, y: 0, zoom: 1 };
}

/**
 * Content-space margin ratio + pixel floor khi fit.
 * ratio 0.15 = thêm 15% mỗi phía content-space. min 80px cho content nhỏ.
 */
const FIT_MARGIN_RATIO = 0.15;
const FIT_MIN_MARGIN_PX = 80;

/**
 * SSOT tính fit zoom — zoom lớn nhất mà bounds fit toàn bộ viewport có margin.
 * Dùng bởi cả fitBounds (F key) và computeDynamicZoomMin (wheel clamp) → 2 flow
 * luôn nhất quán, không "đúp %" mismatch.
 */
export function computeFitZoom(
  bounds: Bounds,
  viewport: { width: number; height: number },
): number {
  if (bounds.width <= 0 || bounds.height <= 0) return 1;
  if (viewport.width <= 0 || viewport.height <= 0) return 1;

  const marginX = Math.max(bounds.width * FIT_MARGIN_RATIO, FIT_MIN_MARGIN_PX);
  const marginY = Math.max(bounds.height * FIT_MARGIN_RATIO, FIT_MIN_MARGIN_PX);
  const effectiveW = bounds.width + marginX * 2;
  const effectiveH = bounds.height + marginY * 2;

  const zoomX = viewport.width / effectiveW;
  const zoomY = viewport.height / effectiveH;
  return clampZoom(Math.min(zoomX, zoomY));
}

/**
 * Camera fit bounds vào viewport, center content. Zoom dùng computeFitZoom
 * để cùng model margin với dynamic min.
 */
export function fitBounds(
  bounds: Bounds,
  viewport: { width: number; height: number },
): Camera {
  if (bounds.width <= 0 || bounds.height <= 0) return resetCamera();

  const zoom = computeFitZoom(bounds, viewport);

  const centerCanvas = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  const centerScreen = { x: viewport.width / 2, y: viewport.height / 2 };

  return {
    zoom,
    x: centerScreen.x - centerCanvas.x * zoom,
    y: centerScreen.y - centerCanvas.y * zoom,
  };
}

export type { Bounds };
