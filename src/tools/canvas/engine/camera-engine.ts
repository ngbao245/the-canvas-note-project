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
//   - Dynamic zoom min (content-aware).
//   - Giới hạn pan 3 lớp (`pan-bounds.ts`, spec `canvas-pan-bounce`):
//       docBounds  = vùng tài liệu, chỉ giãn trong phiên board, reset khi đổi board.
//       phạm vi    = tính lúc dùng từ docBounds × zoom + viewport.
//       gestureRaw = vị trí thô lúc đang kéo màn / lăn; target = bản kéo lố
//                    của nó. Hết cử chỉ → target về phạm vi, ramp đưa current về.
//   - Persist debounce 500ms trên targetRef đã chặn cứng (không lưu chỗ lố).
// ============================================================

import type { Camera } from '../types';
import { ZOOM_MIN, ZOOM_MAX } from '../types';
import { screenToCanvas, type Point } from './coord';
import {
  clampZoom,
  panBy,
  resetCamera,
  zoomAroundPoint,
  solveZoomAnchor,
  fitBounds,
  type Bounds,
} from './camera';
import {
  attractPointerToNearest,
  clampCameraToBounds,
  computeScrollRegion,
  sameBounds,
  softClampCamera,
  unionBounds,
  unsoftCamera,
} from './pan-bounds';
import { computeGridLod } from './grid-lod';
import { INTERFACE_SCALE, getInterfaceScale, useInterfaceStore } from '@/stores/interface-store';

// --- Constants ---

/**
 * Ramp alpha per frame — tỉ lệ current chase target mỗi frame.
 * 0.20 → settle ~333ms, overlap với wheel notch tự nhiên (150-250ms/notch)
 * → notch mới đến khi ramp cũ còn chạy → luôn "on the move", không gap.
 * Alpha 0.35 cũ settle 183ms → có gap "đứng yên" giữa notch → khực khựng.
 */
const ZOOM_RAMP_ALPHA = 0.2;
/**
 * Ramp cho pinch: đuổi nhanh hơn nấc chuột (~5 khung) → vẫn mượt nhưng bám tay.
 * Áp thẳng không ramp thì mỗi sự kiện là 1 bước nhảy nhỏ, mất mượt (bạn báo 2026-10-16).
 */
const PINCH_RAMP_ALPHA = 0.25;
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

// --- Zoom liên tục (pinch touchpad) ---

/**
 * log2 zoom đổi trên mỗi px delta. Chrome quy pinch thành deltaY sao cho tỉ lệ
 * ≈ exp(-deltaY / 100) → log2 = deltaY / (100 · ln2) ≈ 0.0144/px: zoom đúng
 * theo tay. Bản cũ 0.01 chỉ ~70% tay (bạn báo pinch ì, 2026-10-16).
 */
const PINCH_ZOOM_SPEED = 1 / (100 * Math.LN2);

/** Quãng phải đẩy thêm (log2) sau khi kẹp 100% mới vượt. 0.12 ≈ 9% (bạn chốt 2026-10-16, trước 0.3). */
const PINCH_DETENT_LOG = 0.12;

/** Debounce persist camera state ra IndexedDB. */
const PERSIST_DEBOUNCE_MS = 500;

/**
 * Lăn / cuộn touchpad không có sự kiện "thả": ngừng lăn quãng này thì coi như
 * hết cử chỉ, camera đang lố trượt về rìa. Touchpad còn quán tính thì sự kiện
 * vẫn tới, màn đứng ở chỗ lố tới khi hết. Số Kiro tự chọn, đổi được.
 */
const WHEEL_SETTLE_MS = 60;

/**
 * Touchpad đang lố: debounce có trần.
 * - Mỗi sự kiện lúc lố hẹn lại DEBOUNCE: còn vuốt thì còn giữ lố, ngừng là về.
 * - Tính từ lúc bắt đầu lố, giữ tối đa MAX_HOLD dù sự kiện còn tới: Windows gửi
 *   quán tính 1-2 giây sau khi nhấc tay, debounce thuần thì phải chờ hết quán
 *   tính mới về (bạn báo 2026-10-16).
 */
const TOUCHPAD_OVERSCROLL_DEBOUNCE_MS = 80;
const TOUCHPAD_OVERSCROLL_MAX_HOLD_MS = 280;

// --- Types ---

/** camera = camera hiệu dụng (zoom đã nhân tỉ lệ giao diện), boardZoom = zoom board (hiện trên header). */
type CameraListener = (camera: Camera, boardZoom: number) => void;
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

  // Kích thước giao diện (Cài đặt). targetRef/currentRef lưu zoom HIỆU DỤNG = zoom board × scale,
  // nên mọi chỗ đổi toạ độ (kéo, thả, chọn vùng, preview...) đọc getCamera() là tự đúng.
  // Chỉ lưu IDB, giới hạn zoom, mốc 100% và badge zoom quy về zoom board (chia scale).
  private scale = 1;

  /** dynamicMin + maxZoom là giá trị zoom BOARD. */
  private dynamicMin: number = ZOOM_MIN;
  private readonly maxZoom: number = ZOOM_MAX;

  /**
   * Vùng tài liệu của board đang xem: hợp mọi vùng đã nhận trong phiên board,
   * chỉ giãn. Null = chưa biết (vừa đổi board, object chưa nạp) → không chặn.
   */
  private docBounds: Bounds | null = null;
  /** Board mà docBounds thuộc về. Khung bao của board khác bị bỏ qua. */
  private docBoardId: string | null = null;
  /** Vị trí thô (theo tay, không chặn) của cử chỉ kéo màn / lăn đang chạy. */
  private gestureRaw: { x: number; y: number } | null = null;
  private pointerPanActive = false;
  private wheelSettleTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * Sau khi touchpad lố rồi trượt về: chiều bị chặn mỗi trục (1 / -1, 0 = không).
   * Quán tính còn tới thì bỏ phần đẩy ra ngoài, không lố lại. Hết khi nghỉ
   * quá WHEEL_SETTLE_MS (cử chỉ mới).
   */
  private touchpadBlock: { x: number; y: number } | null = null;
  private lastTouchpadAt = -Infinity;
  /** Lúc touchpad bắt đầu lố (performance.now), null = không lố. Dùng cho trần giữ lố. */
  private overscrollStartAt: number | null = null;
  private attractRects: readonly Bounds[] = [];
  private viewportRef: { width: number; height: number } = { width: 0, height: 0 };

  private rampRafId: number | null = null;
  /** Độ đuổi của ramp hiện tại: pinch nhanh hơn, còn lại ZOOM_RAMP_ALPHA. */
  private rampAlpha = ZOOM_RAMP_ALPHA;
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
  // Kẹp 100% cho zoom liên tục: chiều đang bị kẹp (1 in, -1 out, 0 không kẹp) + quãng đã đẩy thêm.
  private pinchDetent = 0;
  private pinchDetentAccum = 0;

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
  /** Zoom board (không gồm tỉ lệ giao diện) — cái hiện trên header và lưu IDB. */
  getBoardZoom(): number {
    return this.currentRef.zoom / this.scale;
  }
  getInterfaceScale(): number {
    return this.scale;
  }
  getDynamicZoomMin(): number {
    return this.dynamicMin;
  }
  getViewport(): { width: number; height: number } {
    return this.viewportRef;
  }
  /** Vùng tài liệu board đang xem (null = chưa biết). Thanh cuộn canvas đọc để vẽ tay cuộn. */
  getDocBounds(): Bounds | null {
    return this.docBounds;
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

  /** Khung từng object trên canvas (canvas-space), để zoom in hút về object gần chuột nhất. */
  setAttractRects(rects: readonly Bounds[]): void {
    this.attractRects = rects;
  }

  /**
   * Vào board khác: quên vùng tài liệu cũ. Gọi TRƯỚC khi nạp camera board mới,
   * để camera không bị chặn theo vùng của board cũ. Cùng board thì giữ (vùng
   * đã giãn không mất khi effect chạy lại).
   */
  resetDocBounds(boardId: string): void {
    if (boardId === this.docBoardId) return;
    this.docBoardId = boardId;
    this.docBounds = null;
    this.dropGesture();
  }

  /**
   * Nhận khung bao object (gồm cả object đang kéo) của board `boardId`.
   * Vùng tài liệu = hợp với vùng cũ → chỉ giãn. Khung của board khác (store
   * object còn giữ board cũ lúc chờ nạp) bị bỏ qua.
   */
  setPanBounds(content: Bounds | null, boardId: string | null): void {
    if (boardId === null || boardId !== this.docBoardId) return;
    const region = computeScrollRegion(content);
    const prev = this.docBounds;
    const next = prev ? unionBounds(prev, region) : region;
    if (prev && sameBounds(prev, next)) return;
    this.docBounds = next;
    // Vùng giãn mà camera đứng yên → không có render nào báo, thanh cuộn phải biết để co tay cuộn.
    this.notifyListeners();

    if (this.gestureRaw) {
      this.retargetGesture();
      return;
    }
    if (!this.clampTarget()) return;
    if (!prev) {
      // Lần đầu dựng vùng sau khi vào board: đặt thẳng, không cho thấy camera trượt lúc nạp.
      this.cancelRamp();
      this.currentRef = this.targetRef;
      this.scheduleRender();
    }
    this.schedulePersist();
  }

  setViewport(width: number, height: number): void {
    if (this.viewportRef.width === width && this.viewportRef.height === height) return;
    this.viewportRef = { width, height };
    if (this.gestureRaw) this.retargetGesture();
    else this.clampTarget();
    // Màn đổi cỡ đổi luôn tỉ lệ tay cuộn dù camera không dời.
    this.notifyListeners();
  }

  /**
   * Đổi tỉ lệ giao diện. Zoom board giữ nguyên, x/y giữ nguyên → nội dung phóng quanh gốc toạ độ
   * (Milanote parity). Zoom vẽ lại ngay; x/y lệch phạm vi mới thì trượt về bằng ramp, không nhảy.
   * Không persist (zoom board không đổi).
   */
  setInterfaceScale(next: number): void {
    if (!(next > 0) || next === this.scale) return;
    const ratio = next / this.scale;
    this.scale = next;
    this.cancelRamp();
    this.dropGesture();
    this.zoomAnchor = null;
    this.detentHeld = false;
    const scaled: Camera = { ...this.targetRef, zoom: this.targetRef.zoom * ratio };
    this.currentRef = scaled;
    this.targetRef = clampCameraToBounds(scaled, this.docBounds, this.viewportRef);
    this.scheduleRender();
    if (this.targetRef !== scaled) this.scheduleRamp();
  }

  // --- Cử chỉ kéo màn / lăn (kéo lố) ---

  /**
   * Chặn cứng đích vào phạm vi; lệch thì ramp đưa camera đang vẽ về (không nhảy).
   * Trả true nếu đích đổi.
   */
  private clampTarget(): boolean {
    const clamped = clampCameraToBounds(this.targetRef, this.docBounds, this.viewportRef);
    if (clamped === this.targetRef) return false;
    this.targetRef = clamped;
    this.scheduleRamp();
    return true;
  }

  /** Đích lúc đang trong cử chỉ = bản kéo lố của vị trí thô, ở zoom đích. */
  private retargetGesture(): void {
    if (!this.gestureRaw) return;
    this.targetRef = this.softTarget(this.gestureRaw);
    this.scheduleRamp();
  }

  private softTarget(raw: { x: number; y: number }): Camera {
    return softClampCamera({ ...raw, zoom: this.targetRef.zoom }, this.docBounds, this.viewportRef);
  }

  /**
   * Cộng `delta` vào vị trí thô rồi đặt đích kéo lố. Cử chỉ mới: vị trí thô
   * suy ngược từ đích (đích có thể còn lố từ cử chỉ trước).
   */
  private moveGesture(delta: Point): void {
    const raw =
      this.gestureRaw ?? unsoftCamera(this.targetRef, this.docBounds, this.viewportRef);
    this.gestureRaw = { x: raw.x + delta.x, y: raw.y + delta.y };
    this.targetRef = this.softTarget(this.gestureRaw);
  }

  private clearWheelTimer(): void {
    if (this.wheelSettleTimer !== null) {
      clearTimeout(this.wheelSettleTimer);
      this.wheelSettleTimer = null;
    }
  }

  /** Hết cử chỉ: đích về phạm vi, ramp có sẵn đưa camera trượt về (giảm tốc, không nảy). */
  private endGesture(): void {
    const hadGesture = this.gestureRaw !== null;
    this.dropGesture();
    if (!hadGesture) return;
    this.clampTarget();
    this.schedulePersist();
  }

  /** Bỏ trạng thái cử chỉ, không tự chặn đích (nơi gọi tự đặt đích mới). */
  private dropGesture(): void {
    this.clearWheelTimer();
    this.overscrollStartAt = null;
    this.gestureRaw = null;
  }

  /** Giới hạn zoom quy ra zoom hiệu dụng. */
  private minEff(): number {
    return this.dynamicMin * this.scale;
  }
  private maxEff(): number {
    return this.maxZoom * this.scale;
  }

  /** Zoom board → kẹp theo giới hạn board → zoom hiệu dụng. */
  private boardToEff(boardZoom: number): number {
    return clampZoom(boardZoom, this.dynamicMin, this.maxZoom) * this.scale;
  }

  // --- Write actions ---

  /**
   * Hydrate từ persisted camera. Snap cả 2 refs, không ramp (tránh flash lúc load).
   */
  hydrate(camera: Camera): void {
    const clampedZoom: Camera = {
      x: camera.x,
      y: camera.y,
      zoom: this.boardToEff(camera.zoom),
    };
    const clamped = clampCameraToBounds(clampedZoom, this.docBounds, this.viewportRef);
    this.targetRef = clamped;
    this.currentRef = clamped;
    this.lastPersistedRef = clamped;
    this.cancelRamp();
    this.dropGesture();
    this.detentHeld = false; // reset detent, tránh kẹt sau load
    this.lastZoomNotchAt = 0;
    this.zoomAnchor = null;
    this.scheduleRender();
  }

  /**
   * Mọi kiểu zoom quanh 1 điểm đi qua đây.
   * 1. Zoom in: chuột ở chỗ trống → neo kéo về điểm gần nhất trên object gần
   *    chuột nhất (`attractPointerToNearest`).
   * 2. Đích = zoom quanh điểm neo rồi chặn giới hạn pan.
   * 3. Neo của hiệu ứng zoom giải ngược từ camera đang vẽ tới đích
   *    (`solveZoomAnchor`) → đường đi là 1 phép zoom thẳng, tới nơi trùng đích.
   *    Bản cũ neo ở chỗ chuột rồi mới chặn → camera chạy theo chuột, đập vào
   *    mép giới hạn rồi bẻ hướng; lăn dồn thì lệch đích, cuối hiệu ứng nhảy.
   *
   * `direct` (pinch / zoom liên tục): neo đúng chỗ ngón tay, không hút về object,
   * ramp đuổi nhanh hơn (PINCH_RAMP_ALPHA) để vừa mượt vừa bám tay.
   */
  private zoomTo(pointer: Point, effZoom: number, direct = false): void {
    // Zoom không kéo lố: đang lố thì về rìa trước (đích chặn cứng), rồi zoom từ đó.
    this.endGesture();
    const prev = this.targetRef;
    const anchor =
      !direct && effZoom > prev.zoom
        ? attractPointerToNearest(pointer, prev, this.attractRects)
        : pointer;
    this.targetRef = clampCameraToBounds(
      zoomAroundPoint(prev, anchor, effZoom, this.minEff(), this.maxEff()),
      this.docBounds,
      this.viewportRef,
    );
    const cur = this.currentRef;
    // Camera đang vẽ còn ở chỗ lố: không neo (nhánh neo chặn cứng từng khung →
    // khung đầu nhảy vào rìa). Lerp thẳng x / y + log zoom tới đích.
    const curOutside = clampCameraToBounds(cur, this.docBounds, this.viewportRef) !== cur;
    this.rampAlpha = direct ? PINCH_RAMP_ALPHA : ZOOM_RAMP_ALPHA;
    const p = curOutside ? null : solveZoomAnchor(cur, this.targetRef);
    const world = p ? screenToCanvas(p, cur) : null;
    this.zoomAnchor =
      p && world ? { screenX: p.x, screenY: p.y, worldX: world.x, worldY: world.y } : null;
    this.scheduleRamp();
    this.schedulePersist();
  }

  /**
   * Pan tức thì, chặn cứng, không kéo lố. Dùng cho tự cuộn lúc kéo object
   * (`useEdgePan`): object bám chuột theo camera đang vẽ, lố thì lệch chuột.
   */
  pan(delta: Point): void {
    this.zoomAnchor = null; // pan phá anchor cursor
    this.dropGesture();
    this.targetRef = clampCameraToBounds(
      panBy(this.targetRef, delta),
      this.docBounds,
      this.viewportRef,
    );
    this.currentRef = clampCameraToBounds(
      panBy(this.currentRef, delta),
      this.docBounds,
      this.viewportRef,
    );
    this.scheduleRender();
    this.schedulePersist();
  }

  /**
   * Kéo màn bằng tay (Space, chuột giữa, Ctrl + kéo): 1:1 trong phạm vi, lố
   * thì nặng dần, có trần. Gọi `endPointerPan` lúc thả để trượt về.
   */
  panElastic(delta: Point): void {
    this.pointerPanActive = true;
    this.applyGestureNow(delta);
  }

  /**
   * Pan touchpad 2 ngón: 1:1 theo tay, không qua ramp (bản cũ đi chung đường
   * chuột → trễ ~4 khung + trôi thêm, bạn báo nặng tay 2026-10-16). Lố được;
   * ngừng WHEEL_SETTLE_MS thì trượt về như lăn chuột.
   */
  panDirect(delta: Point): void {
    const now = performance.now();
    if (now - this.lastTouchpadAt > WHEEL_SETTLE_MS) this.touchpadBlock = null; // cử chỉ mới
    this.lastTouchpadAt = now;

    const block = this.touchpadBlock;
    const d = block
      ? {
          x: block.x !== 0 && Math.sign(delta.x) === block.x ? 0 : delta.x,
          y: block.y !== 0 && Math.sign(delta.y) === block.y ? 0 : delta.y,
        }
      : delta;
    if (d.x === 0 && d.y === 0) return;
    this.applyGestureNow(d);

    if (this.overscrollDir() === null) {
      this.overscrollStartAt = null;
      this.armWheelSettle();
      return;
    }
    // Đang lố: debounce theo sự kiện, nhưng không quá trần tính từ lúc bắt đầu lố.
    this.overscrollStartAt ??= now;
    const left = this.overscrollStartAt + TOUCHPAD_OVERSCROLL_MAX_HOLD_MS - now;
    const wait = Math.max(0, Math.min(TOUCHPAD_OVERSCROLL_DEBOUNCE_MS, left));
    // Chặn chiều vừa lố trước khi trượt về: quán tính touchpad không đẩy ra lần nữa.
    this.armWheelSettle(wait, () => {
      this.touchpadBlock = this.overscrollDir();
    });
  }

  /** Chiều đích đang lố mỗi trục (cùng dấu với delta đã đẩy ra), null nếu trong phạm vi. */
  private overscrollDir(): { x: number; y: number } | null {
    const clamped = clampCameraToBounds(this.targetRef, this.docBounds, this.viewportRef);
    if (clamped === this.targetRef) return null;
    return {
      x: Math.sign(this.targetRef.x - clamped.x),
      y: Math.sign(this.targetRef.y - clamped.y),
    };
  }

  /** Cộng delta vào cử chỉ, camera đang vẽ theo ngay (không chờ ramp). */
  private applyGestureNow(delta: Point): void {
    this.zoomAnchor = null;
    const prevTarget = this.targetRef;
    this.moveGesture(delta);
    if (this.rampRafId !== null) {
      // Ramp còn chạy (vừa zoom / lăn): dời current cùng lượng, ramp tự khép phần lệch.
      this.currentRef = {
        ...this.currentRef,
        x: this.currentRef.x + (this.targetRef.x - prevTarget.x),
        y: this.currentRef.y + (this.targetRef.y - prevTarget.y),
      };
    } else {
      this.currentRef = this.targetRef;
    }
    this.scheduleRender();
    this.schedulePersist();
  }

  /** Thả / huỷ kéo màn. Còn đang lăn thì để hẹn giờ lăn kết thúc cử chỉ. */
  endPointerPan(): void {
    this.pointerPanActive = false;
    if (this.wheelSettleTimer === null) this.endGesture();
  }

  /**
   * Pan mượt qua ramp, dùng cho lăn chuột (nấc to, cần trượt). Lố được như kéo
   * tay; ngừng lăn WHEEL_SETTLE_MS thì trượt về.
   */
  panSmooth(delta: Point): void {
    this.zoomAnchor = null; // pan phá anchor cursor
    this.rampAlpha = ZOOM_RAMP_ALPHA;
    this.moveGesture(delta);
    this.scheduleRamp();
    this.schedulePersist();
    this.armWheelSettle();
  }

  /**
   * Lăn không có sự kiện thả: hẹn lại mỗi sự kiện, hết hẹn thì kết thúc cử chỉ.
   * Đang kéo màn bằng tay thì để `endPointerPan` kết thúc. `beforeEnd` chạy ngay
   * trước khi kết thúc (touchpad lố: ghi chiều cần chặn).
   */
  private armWheelSettle(waitMs = WHEEL_SETTLE_MS, beforeEnd?: () => void): void {
    this.clearWheelTimer();
    this.wheelSettleTimer = setTimeout(() => {
      this.wheelSettleTimer = null;
      this.overscrollStartAt = null;
      if (this.pointerPanActive) return;
      beforeEnd?.();
      this.endGesture();
    }, waitMs);
  }

  /** Zoom tới zoom board cụ thể quanh 1 điểm screen. */
  zoomAt(pointer: Point, newZoom: number): void {
    this.zoomTo(pointer, newZoom * this.scale);
  }

  /** Zoom theo factor (compound trên target) + ramp chase. Cho keyboard/programmatic. */
  zoomByAt(pointer: Point, factor: number): void {
    this.zoomTo(pointer, this.targetRef.zoom * factor);
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
    // So trên zoom board: mốc 100% và nấc zoom không đổi theo tỉ lệ giao diện.
    const current = this.targetRef.zoom / this.scale;

    // Đang kẹp detent tại 100%. Chỉ vượt nếu user đã NGỪNG lăn 1 nhịp (gap đủ
    // lớn = nhả tay rồi lăn lại). Lăn liên tục (gap nhỏ) → nuốt notch, giữ 100%.
    if (this.detentHeld) {
      if (gap < DETENT_RELEASE_MS) return; // vẫn đang lăn liên tục → nuốt
      this.detentHeld = false;
      this.applyStepTarget(pointer, this.boardToEff(zoomingIn ? ZOOM_STEP_IN : ZOOM_STEP_OUT));
      return;
    }

    const next = current * (zoomingIn ? ZOOM_STEP_IN : ZOOM_STEP_OUT);

    // Detent: nấc mới băng qua 1.0 (đổi phía) → kẹp về đúng 1.0. 100% là mốc
    // 1:1, luôn khựng lại dù đang ở nấc nào.
    const crosses = (current > 1 && next < 1) || (current < 1 && next > 1);
    if (crosses) {
      this.detentHeld = true;
      this.applyStepTarget(pointer, this.scale);
      return;
    }

    this.applyStepTarget(pointer, this.boardToEff(next));
  }

  /**
   * Zoom liên tục theo độ lớn delta (pinch touchpad, cuộn 2 ngón kèm Ctrl).
   * Touchpad bắn ~60 sự kiện/giây, delta nhỏ; coi mỗi sự kiện là 1 nấc như
   * `zoomImpulse` thì 40% → 100% → 300% chỉ trong vài khung (bạn báo 2026-10-15).
   *
   * Mốc 100% vẫn khựng, nhưng theo quãng đẩy chứ không theo thời gian (pinch
   * không có "nhả tay" rõ): băng qua 100% thì kẹp lại, phải đẩy tiếp thêm
   * PINCH_DETENT_LOG cùng chiều mới vượt. Đổi chiều thì nhả kẹp ngay.
   */
  zoomContinuous(pointer: Point, deltaY: number): void {
    if (deltaY === 0) return;
    const dLog = -deltaY * PINCH_ZOOM_SPEED; // log2 thay đổi
    const current = this.targetRef.zoom / this.scale;

    if (this.pinchDetent !== 0) {
      if (Math.sign(dLog) !== this.pinchDetent) {
        this.pinchDetent = 0;
        this.pinchDetentAccum = 0;
      } else {
        this.pinchDetentAccum += Math.abs(dLog);
        if (this.pinchDetentAccum < PINCH_DETENT_LOG) return;
        this.pinchDetent = 0;
        this.pinchDetentAccum = 0;
      }
      this.zoomTo(pointer, this.boardToEff(current * Math.pow(2, dLog)), true);
      return;
    }

    const next = current * Math.pow(2, dLog);
    const crosses = (current > 1 && next < 1) || (current < 1 && next > 1);
    if (crosses) {
      this.pinchDetent = Math.sign(dLog);
      this.pinchDetentAccum = 0;
      this.zoomTo(pointer, this.scale, true);
      return;
    }
    this.zoomTo(pointer, this.boardToEff(next), true);
  }

  /** Set target zoom (hiệu dụng) quanh anchor + kick ramp + persist. Dùng bởi zoomImpulse. */
  private applyStepTarget(pointer: Point, targetZoom: number): void {
    this.zoomTo(pointer, targetZoom);
  }

  /** Zoom quanh center viewport. Dùng cho keyboard shortcut. */
  zoomAtCenter(factor: number): void {
    const cx = this.viewportRef.width / 2;
    const cy = this.viewportRef.height / 2;
    this.zoomByAt({ x: cx, y: cy }, factor);
  }

  setZoom(zoom: number, viewport?: { width: number; height: number }): void {
    const vp = viewport ?? this.viewportRef;
    this.zoomTo({ x: vp.width / 2, y: vp.height / 2 }, zoom * this.scale);
  }

  fit(bounds: Bounds, viewport: { width: number; height: number }): void {
    this.zoomAnchor = null; // fit đổi cả x, y, zoom — không quanh cursor
    this.dropGesture();
    const target = fitBounds(bounds, viewport);
    this.targetRef = clampCameraToBounds(
      {
        x: target.x,
        y: target.y,
        // fitBounds tính zoom hiệu dụng vừa khung → clamp theo giới hạn hiệu dụng.
        zoom: clampZoom(target.zoom, this.minEff(), this.maxEff()),
      },
      this.docBounds,
      this.viewportRef,
    );
    this.scheduleRamp();
    this.schedulePersist();
  }

  reset(): void {
    this.zoomAnchor = null;
    this.dropGesture();
    const initial = resetCamera();
    initial.zoom = this.boardToEff(1);
    this.targetRef = clampCameraToBounds(initial, this.docBounds, this.viewportRef);
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
    // Lưu vị trí đã chặn cứng: đang lố mà F5 / đổi board thì khôi phục trong rìa.
    // IDB lưu zoom board, không gồm tỉ lệ giao diện.
    const settled = clampCameraToBounds(this.targetRef, this.docBounds, this.viewportRef);
    const snapshot: Camera = { ...settled, zoom: settled.zoom / this.scale };
    this.lastPersistedRef = this.targetRef;
    try {
      this.persistCb(snapshot);
    } catch (err) {
      console.warn('[cameraEngine] persist error', err);
    }
  }

  destroy(): void {
    this.cancelRamp();
    this.clearWheelTimer();
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
      this.rampAlpha = ZOOM_RAMP_ALPHA;
      this.applyTransforms();
      this.notifyListeners();
      return;
    }

    const alpha = this.rampAlpha;
    const nextZoom = Math.pow(2, logCurrent + dLog * alpha);

    if (this.zoomAnchor) {
      // Zoom around cursor: derive x, y từ zoom(t) giữ anchor invariant.
      // screen_at_cursor = anchor.worldX * zoom + camera.x → camera.x = screen - worldX*zoom.
      // Neo đã giải từ đích nên đường đi gần như luôn trong giới hạn; vẫn chặn
      // từng khung vì giới hạn không tuyến tính theo zoom (phần "giữ lại trên
      // màn" có trần). Không chặn → camera ra ngoài, lần kéo sau giật về.
      this.currentRef = clampCameraToBounds(
        {
          x: this.zoomAnchor.screenX - this.zoomAnchor.worldX * nextZoom,
          y: this.zoomAnchor.screenY - this.zoomAnchor.worldY * nextZoom,
          zoom: nextZoom,
        },
        this.docBounds,
        this.viewportRef,
      );
    } else {
      // Pan/fit/reset không có anchor → lerp x, y linear như cũ.
      this.currentRef = {
        x: this.currentRef.x + dx * alpha,
        y: this.currentRef.y + dy * alpha,
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
    const boardZoom = this.getBoardZoom();
    this.listeners.forEach((fn) => {
      try {
        fn(snapshot, boardZoom);
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

// Đồng bộ tỉ lệ giao diện từ Cài đặt. localStorage hydrate sync nên getState() đã có giá trị đã lưu.
engine.setInterfaceScale(getInterfaceScale());
useInterfaceStore.subscribe((s) => engine.setInterfaceScale(INTERFACE_SCALE[s.size]));

export function getCameraEngine(): CameraEngine {
  return engine;
}
