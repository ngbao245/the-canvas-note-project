// ============================================================
// Canvas — CameraEngine (Motion polish, port từ donor P6)
// ============================================================
//
// Kiến trúc:
//   - targetRef  = camera user muốn (goal). Update sync mỗi input event.
//   - currentRef = camera đang render DOM. Chase target qua rAF ramp.
//   - Pan không ramp (1:1 hand movement) → cả 2 ref update đồng thời.
//   - Zoom có ramp mềm alpha 0.35 (~5 frame ~83ms) → nốt wheel to không "khựng",
//     biến thành sliding continuous.
//   - DOM write trực tiếp qua ref (wrapper + grid), bypass React re-render frame.
//   - Notify listeners sau mỗi flush → store snapshot 60Hz throttled.
//   - Dynamic zoom min (content-aware) + pan bounds clamp (content-aware).
//   - Persist debounce 500ms trên targetRef (goal user cuối).
// ============================================================

import type { Camera } from '../types';
import { ZOOM_MIN, ZOOM_MAX } from '../types';
import type { Point } from './coord';
import {
  clampZoom,
  panBy,
  resetCamera,
  zoomAroundPoint,
  zoomByFactor,
  fitBounds,
  type Bounds,
} from './camera';

// --- Constants ---

const GRID_SIZE = 32;

/** Ramp alpha per frame — 0.35 → convergence ~5 frame (~83ms @ 60Hz). */
const ZOOM_RAMP_ALPHA = 0.35;

/** Snap threshold: |delta| dưới ngưỡng → snap current = target, kết thúc ramp. */
const ZOOM_SNAP_THRESHOLD = 0.0005;
const XY_SNAP_THRESHOLD = 0.1;

/** Debounce persist camera state ra IndexedDB. */
const PERSIST_DEBOUNCE_MS = 500;

// --- Types ---

type CameraListener = (camera: Camera) => void;
type PersistCallback = (camera: Camera) => void;

interface EngineElements {
  wrapper: HTMLElement | null;
  /** Grid layer với doc-size = BASE * 2^level (dense band). */
  gridDense: HTMLElement | null;
  /** Grid layer với doc-size = BASE * 2^(level+1) (sparse band). Cross-fade với dense. */
  gridSparse: HTMLElement | null;
}

// --- Helper: clamp camera vào pan bounds ---
// Model: viewport CENTER phải nằm trong bounds (world-space).
function clampCameraToBounds(
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

// --- CameraEngine class ---

export class CameraEngine {
  private targetRef: Camera;
  private currentRef: Camera;

  private wrapperEl: HTMLElement | null = null;
  private gridDenseEl: HTMLElement | null = null;
  private gridSparseEl: HTMLElement | null = null;

  private dynamicMin: number = ZOOM_MIN;
  private readonly maxZoom: number = ZOOM_MAX;

  private panBoundsRef: Bounds | null = null;
  private viewportRef: { width: number; height: number } = { width: 0, height: 0 };

  private rampRafId: number | null = null;
  private renderRafId: number | null = null;
  private renderDirty = false;

  private listeners = new Set<CameraListener>();
  private persistCb: PersistCallback | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPersistedRef: Camera | null = null;

  constructor(initial: Camera) {
    const clampedInitial: Camera = {
      x: initial.x,
      y: initial.y,
      zoom: clampZoom(initial.zoom, ZOOM_MIN, this.maxZoom),
    };
    this.targetRef = clampedInitial;
    this.currentRef = clampedInitial;
  }

  // --- Read ---
  getCamera(): Camera {
    return this.currentRef;
  }
  getTargetCamera(): Camera {
    return this.targetRef;
  }
  getDynamicZoomMin(): number {
    return this.dynamicMin;
  }
  getViewport(): { width: number; height: number } {
    return this.viewportRef;
  }

  // --- Config ---
  setElements(el: EngineElements): void {
    this.wrapperEl = el.wrapper;
    this.gridDenseEl = el.gridDense;
    this.gridSparseEl = el.gridSparse;
    if (this.wrapperEl || this.gridDenseEl || this.gridSparseEl) this.applyTransforms();
  }

  setPersistCallback(cb: PersistCallback | null): void {
    this.persistCb = cb;
  }

  setDynamicZoomMin(min: number): void {
    const clamped = Math.max(ZOOM_MIN, Math.min(1, min));
    if (clamped === this.dynamicMin) return;
    this.dynamicMin = clamped;
    if (this.targetRef.zoom < clamped) {
      this.targetRef = clampCameraToBounds(
        { ...this.targetRef, zoom: clamped },
        this.panBoundsRef,
        this.viewportRef,
      );
      this.scheduleRamp();
      this.schedulePersist();
    }
  }

  setPanBounds(bounds: Bounds | null): void {
    this.panBoundsRef = bounds;
    const clamped = clampCameraToBounds(this.targetRef, bounds, this.viewportRef);
    if (clamped !== this.targetRef) {
      this.targetRef = clamped;
      this.scheduleRamp();
      this.schedulePersist();
    }
  }

  setViewport(width: number, height: number): void {
    if (this.viewportRef.width === width && this.viewportRef.height === height) return;
    this.viewportRef = { width, height };
    const clamped = clampCameraToBounds(this.targetRef, this.panBoundsRef, this.viewportRef);
    if (clamped !== this.targetRef) {
      this.targetRef = clamped;
      this.scheduleRamp();
    }
  }

  // --- Write actions ---

  /**
   * Hydrate từ persisted camera. Snap cả 2 refs, không ramp (tránh flash lúc load).
   */
  hydrate(camera: Camera): void {
    const clampedZoom: Camera = {
      x: camera.x,
      y: camera.y,
      zoom: clampZoom(camera.zoom, this.dynamicMin, this.maxZoom),
    };
    const clamped = clampCameraToBounds(clampedZoom, this.panBoundsRef, this.viewportRef);
    this.targetRef = clamped;
    this.currentRef = clamped;
    this.lastPersistedRef = clamped;
    this.cancelRamp();
    this.scheduleRender();
  }

  /** Pan immediate: cả 2 refs update sync. Dùng cho pointer drag. */
  pan(delta: Point): void {
    this.targetRef = clampCameraToBounds(
      panBy(this.targetRef, delta),
      this.panBoundsRef,
      this.viewportRef,
    );
    this.currentRef = clampCameraToBounds(
      panBy(this.currentRef, delta),
      this.panBoundsRef,
      this.viewportRef,
    );
    this.scheduleRender();
    this.schedulePersist();
  }

  /** Pan smoothed qua ramp. Dùng cho wheel/trackpad scroll. */
  panSmooth(delta: Point): void {
    this.targetRef = clampCameraToBounds(
      panBy(this.targetRef, delta),
      this.panBoundsRef,
      this.viewportRef,
    );
    this.scheduleRamp();
    this.schedulePersist();
  }

  /** Zoom tới zoom cụ thể quanh 1 điểm screen. */
  zoomAt(pointer: Point, newZoom: number): void {
    this.targetRef = clampCameraToBounds(
      zoomAroundPoint(this.targetRef, pointer, newZoom, this.dynamicMin, this.maxZoom),
      this.panBoundsRef,
      this.viewportRef,
    );
    this.scheduleRamp();
    this.schedulePersist();
  }

  /** Zoom theo factor (wheel notch). Compound trên target. */
  zoomByAt(pointer: Point, factor: number): void {
    this.targetRef = clampCameraToBounds(
      zoomByFactor(this.targetRef, pointer, factor, this.dynamicMin, this.maxZoom),
      this.panBoundsRef,
      this.viewportRef,
    );
    this.scheduleRamp();
    this.schedulePersist();
  }

  /** Zoom quanh center viewport. Dùng cho keyboard shortcut. */
  zoomAtCenter(factor: number): void {
    const cx = this.viewportRef.width / 2;
    const cy = this.viewportRef.height / 2;
    this.zoomByAt({ x: cx, y: cy }, factor);
  }

  setZoom(zoom: number, viewport?: { width: number; height: number }): void {
    const vp = viewport ?? this.viewportRef;
    const anchor = { x: vp.width / 2, y: vp.height / 2 };
    this.targetRef = clampCameraToBounds(
      zoomAroundPoint(this.targetRef, anchor, zoom, this.dynamicMin, this.maxZoom),
      this.panBoundsRef,
      this.viewportRef,
    );
    this.scheduleRamp();
    this.schedulePersist();
  }

  fit(bounds: Bounds, viewport: { width: number; height: number }): void {
    const target = fitBounds(bounds, viewport);
    this.targetRef = clampCameraToBounds(
      {
        x: target.x,
        y: target.y,
        zoom: clampZoom(target.zoom, this.dynamicMin, this.maxZoom),
      },
      this.panBoundsRef,
      this.viewportRef,
    );
    this.scheduleRamp();
    this.schedulePersist();
  }

  reset(): void {
    const initial = resetCamera();
    initial.zoom = clampZoom(1, this.dynamicMin, this.maxZoom);
    this.targetRef = clampCameraToBounds(initial, this.panBoundsRef, this.viewportRef);
    this.scheduleRamp();
    this.schedulePersist();
  }

  // --- Subscribe ---
  subscribe(fn: CameraListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  // --- Persist ---
  flushPersist(): void {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    if (!this.persistCb) return;
    if (this.targetRef === this.lastPersistedRef) return;
    const snapshot: Camera = { ...this.targetRef };
    this.lastPersistedRef = this.targetRef;
    try {
      this.persistCb(snapshot);
    } catch (err) {
      console.warn('[cameraEngine] persist error', err);
    }
  }

  destroy(): void {
    this.cancelRamp();
    if (this.renderRafId !== null) {
      cancelAnimationFrame(this.renderRafId);
      this.renderRafId = null;
    }
    this.flushPersist();
    this.listeners.clear();
    this.wrapperEl = null;
    this.gridDenseEl = null;
    this.gridSparseEl = null;
  }

  // --- Internal: render scheduling ---
  private scheduleRender(): void {
    this.renderDirty = true;
    if (this.renderRafId !== null) return;
    this.renderRafId = requestAnimationFrame(() => {
      this.renderRafId = null;
      this.flushRender();
    });
  }

  private flushRender(): void {
    if (!this.renderDirty) return;
    this.renderDirty = false;
    this.applyTransforms();
    this.notifyListeners();
  }

  // --- Internal: interp ramp ---
  private scheduleRamp(): void {
    if (this.rampRafId !== null) return;
    this.rampRafId = requestAnimationFrame(() => this.rampStep());
  }

  private cancelRamp(): void {
    if (this.rampRafId !== null) {
      cancelAnimationFrame(this.rampRafId);
      this.rampRafId = null;
    }
  }

  private rampStep(): void {
    this.rampRafId = null;

    const dx = this.targetRef.x - this.currentRef.x;
    const dy = this.targetRef.y - this.currentRef.y;
    const dz = this.targetRef.zoom - this.currentRef.zoom;

    const done =
      Math.abs(dz) < ZOOM_SNAP_THRESHOLD &&
      Math.abs(dx) < XY_SNAP_THRESHOLD &&
      Math.abs(dy) < XY_SNAP_THRESHOLD;

    if (done) {
      this.currentRef = { ...this.targetRef };
      this.applyTransforms();
      this.notifyListeners();
      return;
    }

    this.currentRef = {
      x: this.currentRef.x + dx * ZOOM_RAMP_ALPHA,
      y: this.currentRef.y + dy * ZOOM_RAMP_ALPHA,
      zoom: this.currentRef.zoom + dz * ZOOM_RAMP_ALPHA,
    };
    this.applyTransforms();
    this.notifyListeners();

    this.rampRafId = requestAnimationFrame(() => this.rampStep());
  }

  // --- Internal: DOM write ---
  //
  // Grid LOD (level of detail):
  //   Target: screen-space dot spacing luôn nằm trong [BASE, 2×BASE] px, không đổi
  //   theo zoom (Milanote/Figma feel — dot không dày đặc khi zoom out, không thưa
  //   khi zoom in).
  //
  //   Math: t = log2(1/zoom), level = floor(t), frac = t - level.
  //   Dense doc-size = BASE × 2^level      → screen = BASE / 2^frac ∈ [BASE/2, BASE]
  //   Sparse doc-size = BASE × 2^(level+1) → screen = 2×BASE / 2^frac ∈ [BASE, 2×BASE]
  //
  //   Cross-fade giữa 2 layer theo frac:
  //     frac=0: dense opacity 1, sparse 0 → thấy dense ở BASE px (perfect).
  //     frac→1: dense fade out (đang trở nên quá dense), sparse fade in.
  //     Khi frac=1 = level+1 mới, dense mới = sparse cũ. Chuyển band mượt.
  //
  //   Fade extremes: zoom < 0.15 hoặc zoom > 3 → toàn bộ grid fade về 0.
  //   Zoom cực out (overview) sạch không nhiễu; zoom cực in không cần grid nữa.
  private applyTransforms(): void {
    const { x, y, zoom } = this.currentRef;

    if (this.wrapperEl) {
      this.wrapperEl.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`;
      this.wrapperEl.style.transformOrigin = '0 0';
    }

    if (!this.gridDenseEl && !this.gridSparseEl) return;

    const BASE = GRID_SIZE;
    const t = Math.log2(1 / zoom);
    const level = Math.floor(t);
    const frac = t - level;

    const denseDoc = BASE * Math.pow(2, level);
    const sparseDoc = BASE * Math.pow(2, level + 1);
    const denseScreen = denseDoc * zoom;
    const sparseScreen = sparseDoc * zoom;

    // Chỉ fade khi zoom out cực (overview sạch). Zoom in KHÔNG fade — user
    // zoom in = xem chi tiết, dot luôn hữu ích cho cảm nhận grid.
    let extremeMul = 1;
    if (zoom < 0.2) extremeMul = Math.max(0, (zoom - 0.15) / 0.05);

    const denseOp = (1 - frac) * extremeMul;
    const sparseOp = frac * extremeMul;

    if (this.gridDenseEl) {
      this.gridDenseEl.style.backgroundSize = `${denseScreen}px ${denseScreen}px`;
      const posX = ((x % denseScreen) + denseScreen) % denseScreen;
      const posY = ((y % denseScreen) + denseScreen) % denseScreen;
      this.gridDenseEl.style.backgroundPosition = `${posX}px ${posY}px`;
      this.gridDenseEl.style.opacity = String(denseOp);
    }
    if (this.gridSparseEl) {
      this.gridSparseEl.style.backgroundSize = `${sparseScreen}px ${sparseScreen}px`;
      const posX = ((x % sparseScreen) + sparseScreen) % sparseScreen;
      const posY = ((y % sparseScreen) + sparseScreen) % sparseScreen;
      this.gridSparseEl.style.backgroundPosition = `${posX}px ${posY}px`;
      this.gridSparseEl.style.opacity = String(sparseOp);
    }
  }

  private notifyListeners(): void {
    const snapshot: Camera = { ...this.currentRef };
    this.listeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch (err) {
        console.warn('[cameraEngine] listener error', err);
      }
    });
  }

  private schedulePersist(): void {
    if (!this.persistCb) return;
    if (this.persistTimer !== null) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.flushPersist();
    }, PERSIST_DEBOUNCE_MS);
  }
}

// --- Singleton ---
const engine = new CameraEngine({ x: 0, y: 0, zoom: 1 });

export function getCameraEngine(): CameraEngine {
  return engine;
}
