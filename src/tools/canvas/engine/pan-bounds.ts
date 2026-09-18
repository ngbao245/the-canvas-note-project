import type { Camera } from '../types';
import type { Bounds } from './camera';

/**
 * Clamp camera vào pan bounds — pure function, không đụng DOM/state.
 *
 * Model: viewport CENTER phải nằm trong bounds (world-space). Tách khỏi
 * camera-engine để logic clamp không lẫn với ramp/DOM write, test dễ.
 */
export function clampCameraToBounds(
  camera: Camera,
  bounds: Bounds | null,
  viewport: { width: number; height: number },
): Camera {
  if (!bounds || viewport.width <= 0 || viewport.height <= 0) return camera;
  const { zoom } = camera;
  const camMaxX = viewport.width / 2 - bounds.x * zoom;
  const camMinX = viewport.width / 2 - (bounds.x + bounds.width) * zoom;
  const camMaxY = viewport.height / 2 - bounds.y * zoom;
  const camMinY = viewport.height / 2 - (bounds.y + bounds.height) * zoom;
  const clampedX = Math.max(camMinX, Math.min(camMaxX, camera.x));
  const clampedY = Math.max(camMinY, Math.min(camMaxY, camera.y));
  if (clampedX === camera.x && clampedY === camera.y) return camera;
  return { zoom, x: clampedX, y: clampedY };
}
