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
import { clampCameraToBounds } from './pan-bounds';
import { computeGridLod } from './grid-lod';

// --- Constants ---

/**
 * Ramp alpha per frame — tỉ lệ current chase target mỗi frame.
 * 0.20 → settle ~333ms, overlap với wheel notch tự nhiên (150-250ms/notch)
 * → notch mới đến khi ramp cũ còn chạy → luôn "on the move", không gap.
 * Alpha 0.35 cũ settle 183ms → có gap "đứng yên" giữa notch → khực khựng.
 */
const ZOOM_RAMP_ALPHA = 0.2;
const ZOOM_LOG_SNAP_THRESHOLD = 0.004;
const XY_SNAP_THRESHOLD = 0.1;

// --- Step-based zoom (wheel notch, Milanote parity) ---
//
// Model (đo từ Milanote): zoom nhảy theo NẤC NHÂN cố định per notch, KHÔNG
// momentum tự do. targetRef.zoom = nấc kế tiếp, rampStep chase mượt log-space
// tới đó. Notch dồn dập → target nhảy nhiều nấc, ramp chase liên tục 1 lần →
// vẫn "trượt" mượt (2A).
//
//   Zoom in:  target ×= 1.25 mỗi notch (40→50→63→78→98→...→300)
//   Zoom out: target ×= 0.75 mỗi notch (bước to hơn, out nhanh thoát — 1A)
//
// KHÔNG đối xứng: 1/1.25 = 0.8 nhưng out dùng 0.75 để zoom out dứt khoát hơn,
// khớp data Milanote đo được.

/** Nhân zoom mỗi notch khi zoom IN. log2(1.25) ≈ 0.322. */
const ZOOM_STEP_IN = 1.25;

/** Nhân zoom mỗi notch khi zoom OUT. Nhỏ hơn 1/1.25 → out nhanh hơn (Milanote). */
const ZOOM_STEP_OUT = 0.75;

// --- Detent tại 100% (zoom = 1.0), time-gated ---
//
// 100% = mốc 1:1 pixel quan trọng. Khi 1 notch làm zoom băng qua 1.0 → kẹp về
// đúng 1.0 (khựng). Để VƯỢT qua 100%, user phải NGỪNG lăn 1 nhịp rồi lăn lại.
//
// Milanote parity: lăn LIÊN TỤC → đứng ở 100%, các notch bị nuốt. Ngừng >
// DETENT_RELEASE_MS (user "nhả tay") → notch kế tiếp mới vượt. Cơ chế time-gate,
// không phải notch-gate — vì lăn liên tục = 1 ý định, ngừng-rồi-lăn = ý định mới.

/** Ngừng lăn >= ngưỡng này (ms) mới nhả detent để vượt 100%. */
const DETENT_RELEASE_MS = 250;

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

  // Anchor lock cho zoom around point. Cache tại lúc kick zoom → trong ramp
  // derive x, y từ zoom(t) giữ điểm dưới cursor cố định world. KHÔNG lerp x, y
  // riêng vì log-space zoom + linear x/y = progress khác nhau → cursor drift.
  // Data đo: 5 notch nhanh → drift 12px screen giữa ramp (visible pulse).
  // Null = không có anchor (pan/fit/reset) → x, y lerp linear như cũ.
  private zoomAnchor: {
    screenX: number;
    screenY: number;
    worldX: number;
    worldY: number;
  } | null = null;

  // Step zoom state (wheel notch).
  // Detent: true = target đang kẹp tại 100%, chờ user ngừng lăn 1 nhịp mới vượt.
  private detentHeld = false;
  // Timestamp notch zoom gần nhất (ms) — đo gap để phát hiện "ngừng lăn".
  private lastZoomNotchAt = 0;

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

  /** World layer wrapper (element engine ghi transform). Dùng để nâng z-index
   *  cả world layer khi drag object (vượt stacking context lên trên Unsort tab). */
  getWrapper(): HTMLElement | null {
    return this.wrapperEl;
  }

  setPersistCallback(cb: PersistCallback | null): void {
    this.persistCb = cb;
  }

  setDynamicZoomMin(min: number): void {
    const clamped = Math.max(ZOOM_MIN, Math.min(1, min));
    if (clamped === this.dynamicMin) return;
    this.dynamicMin = clamped;
    // KHÔNG force clamp current zoom lên min. dynamicMin chỉ là constraint
    // cho zoom action mới (wheel/pinch/zoomByAt). Bounds thay đổi nhất thời
    // (VD drag 1 item duy nhất → bounds tạm null → min=0.4) không được kéo
    // camera đang zoom < min về min. User đang xa content là chủ ý.
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
    this.detentHeld = false; // reset detent, tránh kẹt sau load
    this.lastZoomNotchAt = 0;
    this.zoomAnchor = null;
    this.scheduleRender();
  }

  /**
   * Cache anchor screen + world tại thời điểm zoom kick. Trong rampStep, x, y
   * sẽ derive từ zoom(t) qua công thức screen = anchor.world * zoom + camera.xy
   * → giữ điểm dưới cursor cố định world suốt ramp, không drift.
   *
   * Dùng CURRENT camera (không phải target) làm reference vì current là snapshot
   * DOM đang render — đảm bảo tại thời điểm anchor cache, invariant đang giữ.
   */
  private cacheZoomAnchor(pointer: Point): void {
    const cam = this.currentRef;
    this.zoomAnchor = {
      screenX: pointer.x,
      screenY: pointer.y,
      worldX: (pointer.x - cam.x) / cam.zoom,
      worldY: (pointer.y - cam.y) / cam.zoom,
    };
  }

  /** Pan immediate: cả 2 refs update sync. Dùng cho pointer drag. */
  pan(delta: Point): void {
    this.zoomAnchor = null; // pan phá anchor cursor
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
    this.zoomAnchor = null; // pan phá anchor cursor
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
    this.cacheZoomAnchor(pointer);
    this.targetRef = clampCameraToBounds(
      zoomAroundPoint(this.targetRef, pointer, newZoom, this.dynamicMin, this.maxZoom),
      this.panBoundsRef,
      this.viewportRef,
    );
    this.scheduleRamp();
    this.schedulePersist();
  }

  /** Zoom theo factor (compound trên target) + ramp chase. Cho keyboard/programmatic. */
  zoomByAt(pointer: Point, factor: number): void {
    this.cacheZoomAnchor(pointer);
    this.targetRef = clampCameraToBounds(
      zoomByFactor(this.targetRef, pointer, factor, this.dynamicMin, this.maxZoom),
      this.panBoundsRef,
      this.viewportRef,
    );
    this.scheduleRamp();
    this.schedulePersist();
  }

  /**
   * Zoom step (wheel notch, Milanote parity). 1 notch = đúng 1 nấc, KHÔNG phụ
   * thuộc độ lớn deltaY (lăn mạnh/nhẹ không đổi bước — chỉ đổi tần suất event).
   * rampStep chase mượt tới nấc mới.
   *   deltaY < 0 (scroll up)   → zoom in  → target ×= ZOOM_STEP_IN.
   *   deltaY > 0 (scroll down)  → zoom out → target ×= ZOOM_STEP_OUT.
   *
   * Detent 100% time-gated: nấc mới băng qua 1.0 → kẹp về 1.0 (khựng). Để vượt,
   * user phải NGỪNG lăn >= DETENT_RELEASE_MS rồi lăn lại. Lăn liên tục → notch
   * bị nuốt, giữ 100%.
   */
  zoomImpulse(pointer: Point, deltaY: number): void {
    if (deltaY === 0) return;

    const now = performance.now();
    const gap = now - this.lastZoomNotchAt;
    this.lastZoomNotchAt = now;

    const zoomingIn = deltaY < 0;
    const current = this.targetRef.zoom;

    // Đang kẹp detent tại 100%. Chỉ vượt nếu user đã NGỪNG lăn 1 nhịp (gap đủ
    // lớn = nhả tay rồi lăn lại). Lăn liên tục (gap nhỏ) → nuốt notch, giữ 100%.
    if (this.detentHeld) {
      if (gap < DETENT_RELEASE_MS) return; // vẫn đang lăn liên tục → nuốt
      this.detentHeld = false;
      const escaped = clampZoom(
        1 * (zoomingIn ? ZOOM_STEP_IN : ZOOM_STEP_OUT),
        this.dynamicMin,
        this.maxZoom,
      );
      this.applyStepTarget(pointer, escaped);
      return;
    }

    const next = current * (zoomingIn ? ZOOM_STEP_IN : ZOOM_STEP_OUT);

    // Detent: nấc mới băng qua 1.0 (đổi phía) → kẹp về đúng 1.0. 100% là mốc
    // 1:1, luôn khựng lại dù đang ở nấc nào.
    const crosses = (current > 1 && next < 1) || (current < 1 && next > 1);
    if (crosses) {
      this.detentHeld = true;
      this.applyStepTarget(pointer, 1);
      return;
    }

    this.applyStepTarget(pointer, clampZoom(next, this.dynamicMin, this.maxZoom));
  }

  /** Set target zoom quanh anchor + kick ramp + persist. Dùng bởi zoomImpulse. */
  private applyStepTarget(pointer: Point, targetZoom: number): void {
    this.cacheZoomAnchor(pointer);
    this.targetRef = clampCameraToBounds(
      zoomAroundPoint(this.targetRef, pointer, targetZoom, this.dynamicMin, this.maxZoom),
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
    this.cacheZoomAnchor(anchor);
    this.targetRef = clampCameraToBounds(
      zoomAroundPoint(this.targetRef, anchor, zoom, this.dynamicMin, this.maxZoom),
      this.panBoundsRef,
      this.viewportRef,
    );
    this.scheduleRamp();
    this.schedulePersist();
  }

  fit(bounds: Bounds, viewport: { width: number; height: number }): void {
    this.zoomAnchor = null; // fit đổi cả x, y, zoom — không quanh cursor
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
    this.zoomAnchor = null;
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

    const logCurrent = Math.log2(this.currentRef.zoom);
    const logTarget = Math.log2(this.targetRef.zoom);
    const dLog = logTarget - logCurrent;

    const done =
      Math.abs(dLog) < ZOOM_LOG_SNAP_THRESHOLD &&
      Math.abs(dx) < XY_SNAP_THRESHOLD &&
      Math.abs(dy) < XY_SNAP_THRESHOLD;

    if (done) {
      this.currentRef = { ...this.targetRef };
      this.zoomAnchor = null; // ramp settled → hết cần lock anchor
      this.applyTransforms();
      this.notifyListeners();
      return;
    }

    const nextZoom = Math.pow(2, logCurrent + dLog * ZOOM_RAMP_ALPHA);

    if (this.zoomAnchor) {
      // Zoom around cursor: derive x, y từ zoom(t) giữ anchor invariant.
      // screen_at_cursor = anchor.worldX * zoom + camera.x → camera.x = screen - worldX*zoom.
      // Bỏ qua targetRef.x/y linear lerp — anchor derive luôn chính xác.
      this.currentRef = {
        x: this.zoomAnchor.screenX - this.zoomAnchor.worldX * nextZoom,
        y: this.zoomAnchor.screenY - this.zoomAnchor.worldY * nextZoom,
        zoom: nextZoom,
      };
    } else {
      // Pan/fit/reset không có anchor → lerp x, y linear như cũ.
      this.currentRef = {
        x: this.currentRef.x + dx * ZOOM_RAMP_ALPHA,
        y: this.currentRef.y + dy * ZOOM_RAMP_ALPHA,
        zoom: nextZoom,
      };
    }

    this.applyTransforms();
    this.notifyListeners();

    this.rampRafId = requestAnimationFrame(() => this.rampStep());
  }

  // --- Internal: DOM write ---
  //
  // Wrapper transform: translate + scale từ currentRef.
  // Grid LOD math tách sang grid-lod.ts (pure), file này chỉ apply DOM.
  private applyTransforms(): void {
    const { x, y, zoom } = this.currentRef;

    if (this.wrapperEl) {
      this.wrapperEl.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`;
      this.wrapperEl.style.transformOrigin = '0 0';
    }

    if (!this.gridDenseEl && !this.gridSparseEl) return;

    const lod = computeGridLod(this.currentRef);
    if (this.gridDenseEl) {
      this.gridDenseEl.style.backgroundSize = `${lod.dense.screenSize}px ${lod.dense.screenSize}px`;
      this.gridDenseEl.style.backgroundPosition = `${lod.dense.posX}px ${lod.dense.posY}px`;
      this.gridDenseEl.style.opacity = String(lod.dense.opacity);
    }
    if (this.gridSparseEl) {
      this.gridSparseEl.style.backgroundSize = `${lod.sparse.screenSize}px ${lod.sparse.screenSize}px`;
      this.gridSparseEl.style.backgroundPosition = `${lod.sparse.posX}px ${lod.sparse.posY}px`;
      this.gridSparseEl.style.opacity = String(lod.sparse.opacity);
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
