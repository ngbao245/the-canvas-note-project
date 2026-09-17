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

/** AABB test giữa 2 rectangle (cùng coord space). */
export function aabbIntersect(a: Bounds, b: Bounds): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}
