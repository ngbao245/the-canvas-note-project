// ============================================================
// Canvas — Camera store (Zustand snapshot layer)
// ============================================================
//
// CameraEngine là source of truth (refs + rAF). Store chỉ giữ snapshot
// reactive cho React consumer (VD header hiện zoom%). Actions forward xuống
// engine, engine flush snapshot vào store 60Hz throttled qua listener.
//
// Persist KHÔNG chạm store. CanvasSurface / bootstrap inject setPersistCallback
// vào engine → engine trailing-debounced 500ms save.
// ============================================================

import { create } from 'zustand';
import type { Camera } from '../types';
import type { Point, Bounds } from '../engine/coord';
import { getCameraEngine } from '../engine/camera-engine';

interface CameraState {
  camera: Camera;

  hydrate: (camera: Camera) => void;
  setZoom: (zoom: number, viewport?: { width: number; height: number }) => void;
  zoomAt: (pointer: Point, newZoom: number) => void;
  zoomByAt: (pointer: Point, factor: number) => void;
  /** Pan immediate 1:1 — cho pointer drag. */
  pan: (delta: Point) => void;
  /** Pan smoothed qua ramp — cho wheel/trackpad. */
  panSmooth: (delta: Point) => void;
  zoomAtCenter: (factor: number) => void;
  reset: () => void;
  fit: (bounds: Bounds, viewport: { width: number; height: number }) => void;
}

const engine = getCameraEngine();

export const useCameraStore = create<CameraState>(() => ({
  camera: engine.getCamera(),

  hydrate: (camera) => engine.hydrate(camera),
  setZoom: (zoom, viewport) => engine.setZoom(zoom, viewport),
  zoomAt: (pointer, newZoom) => engine.zoomAt(pointer, newZoom),
  zoomByAt: (pointer, factor) => engine.zoomByAt(pointer, factor),
  pan: (delta) => engine.pan(delta),
  panSmooth: (delta) => engine.panSmooth(delta),
  zoomAtCenter: (factor) => engine.zoomAtCenter(factor),
  reset: () => engine.reset(),
  fit: (bounds, viewport) => engine.fit(bounds, viewport),
}));

// Wire engine → store snapshot. Zustand subscribers fire, React consumer
// re-render 60Hz throttled trong lúc ramp.
engine.subscribe((camera) => {
  useCameraStore.setState({ camera });
});
