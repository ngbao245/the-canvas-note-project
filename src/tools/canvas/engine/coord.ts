import type { Camera } from '../types';

/** Point trong screen space hoặc canvas space (tuỳ context). */
export interface Point {
  x: number;
  y: number;
}

/** AABB rectangle. */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convert screen coord (pixel viewport) → canvas coord (không gian vô hạn).
 * canvas = (screen - cameraOffset) / zoom
 */
export function screenToCanvas(pointer: Point, camera: Camera): Point {
  return {
    x: (pointer.x - camera.x) / camera.zoom,
    y: (pointer.y - camera.y) / camera.zoom,
  };
}

/**
 * Convert canvas coord → screen coord.
 * screen = canvas * zoom + cameraOffset
 */
export function canvasToScreen(pointer: Point, camera: Camera): Point {
  return {
    x: pointer.x * camera.zoom + camera.x,
    y: pointer.y * camera.zoom + camera.y,
  };
}

/**
 * Convert toạ độ client (clientX/clientY từ pointer event) → canvas coord.
 * Tự lấy rect của surface (`[data-canvas-surface]`) + camera hiện tại, nên
 * caller không phải tính tay công thức `(client - rect.left - cam.x) / zoom`.
 *
 * Trả null nếu chưa mount surface. Không kiểm tra client có nằm trong surface
 * hay không — caller tự lo nếu cần (xem hit-test.ts).
 */
export function clientToCanvas(clientX: number, clientY: number, camera: Camera): Point | null {
  const surface = document.querySelector('[data-canvas-surface]');
  if (!(surface instanceof HTMLElement)) return null;
  const rect = surface.getBoundingClientRect();
  return screenToCanvas({ x: clientX - rect.left, y: clientY - rect.top }, camera);
}

/**
 * Vùng canvas-space đang hiện trên màn hình. `viewport` = kích thước surface
 * (lấy từ CameraEngine.getViewport, đã sync qua ResizeObserver). Viewport chưa
 * đo (0×0) → null, caller coi như không lọc.
 */
export function visibleCanvasBounds(
  camera: Camera,
  viewport: { width: number; height: number },
): Bounds | null {
  if (viewport.width === 0 || viewport.height === 0) return null;
  const tl = screenToCanvas({ x: 0, y: 0 }, camera);
  return { x: tl.x, y: tl.y, width: viewport.width / camera.zoom, height: viewport.height / camera.zoom };
}

/** AABB test giữa 2 rectangle (cùng coord space). */
export function aabbIntersect(a: Bounds, b: Bounds): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}
