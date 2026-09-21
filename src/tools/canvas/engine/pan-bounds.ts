import type { Camera } from '../types';
import type { Bounds } from './camera';

/**
 * Clamp camera vào pan bounds — pure function, không đụng DOM/state.
 *
 * Model: `bounds` phải có ít nhất 1 phần visible trong viewport. Cho phép
 * user pan content tới bất kỳ vị trí nào trong viewport (không bị force
 * canh giữa). Chỉ chặn khi content ra hoàn toàn khỏi màn.
 *
 * Model cũ (viewport center trong bounds) khiến bounds nhỏ auto-center content
 * → camera "tự canh giữa" gây rối UX. Model mới free pan như Milanote/Miro.
 */
export function clampCameraToBounds(
  camera: Camera,
  bounds: Bounds | null,
  viewport: { width: number; height: number },
): Camera {
  if (!bounds || viewport.width <= 0 || viewport.height <= 0) return camera;
  const { zoom } = camera;

  // World → screen: screen_x = world_x * zoom + camera.x
  // Bounds edges trên screen:
  //   left  = bounds.x * zoom + camera.x
  //   right = (bounds.x + bounds.width) * zoom + camera.x
  // Visible: right > 0 AND left < viewport.width
  //   → camera.x > -(bounds.x + bounds.width) * zoom      (right edge > 0)
  //   → camera.x <  viewport.width - bounds.x * zoom      (left edge < viewport.width)
  const camMinX = -(bounds.x + bounds.width) * zoom;
  const camMaxX = viewport.width - bounds.x * zoom;
  const camMinY = -(bounds.y + bounds.height) * zoom;
  const camMaxY = viewport.height - bounds.y * zoom;

  const clampedX = Math.max(camMinX, Math.min(camMaxX, camera.x));
  const clampedY = Math.max(camMinY, Math.min(camMaxY, camera.y));
  if (clampedX === camera.x && clampedY === camera.y) return camera;
  return { zoom, x: clampedX, y: clampedY };
}
