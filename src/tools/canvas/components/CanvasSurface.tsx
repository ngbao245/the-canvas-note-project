import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { StickyNote } from 'lucide-react';
import { useObjectsStore } from '../store/objects-store';
import { useInteractionStore } from '../store/interaction-store';
import { useSelectionStore } from '../store/selection-store';
import { useUnsortStore } from '../store/unsort-store';
import { SCROLL_SPEED_FACTOR, useCanvasSettingsStore } from '@/stores/canvas-settings-store';
import { getCameraEngine } from '../engine/camera-engine';
import { screenToCanvas } from '../engine/coord';
import { createObjectAt } from '../engine/actions';
import { usePointerInteraction } from '../hooks/usePointerInteraction';
import {
  computeContentBounds,
  computeDynamicZoomMin,
  computePanBounds,
} from '../lib/content-bounds';
import { ObjectsLayer } from './ObjectsLayer';
import { MarqueeOverlay } from './MarqueeOverlay';
import { ContextMenu } from './ContextMenu';
import { Toolbar } from './Toolbar';
import { UnsortToggle } from './UnsortPanel';
import { CanvasObjectDragPreview } from './CanvasObjectDragPreview';
import './objects'; // side-effect: register mọi object type vào registry

/**
 * CanvasSurface — khung nhận wheel/pointer, đăng ký DOM refs với CameraEngine.
 *
 * Wheel convention (Milanote/Figma):
 *   - Wheel = pan (dọc). Shift+wheel = pan ngang. Ctrl+wheel = zoom around cursor.
 *   - Trackpad pinch trên Mac tự có ctrlKey=true (browser convention) → zoom.
 *
 * Zoom momentum (xem CameraEngine.zoomImpulse):
 *   - Mỗi notch bơm impulse vào zoomVelocity, friction kéo tắt dần.
 *   - Notch dồn dập → cộng dồn velocity → đà mượt. Notch thưa → glide liên tục,
 *     không "khựng" từng nấc. Ngừng scroll → "luôn trượt đi" rồi tắt.
 *
 * Tốc độ cuộn lấy từ Cài đặt → Canvas (SCROLL_SPEED_FACTOR, mặc định 0.5:
 * deltaY=100 → 50px). Đọc getState mỗi lần cuộn → đổi setting không cần gắn lại listener.
 * Lưới nền ẩn/hiện theo Cài đặt (chỉ ẩn 2 lớp chấm, engine vẫn ghi style qua ref).
 *
 * ResizeObserver track viewport, recompute dynamic zoom min + pan bounds mỗi khi
 * objects hoặc viewport đổi.
 */

function normalizeWheelDelta(e: WheelEvent): { dx: number; dy: number } {
  let dx = e.deltaX;
  let dy = e.deltaY;
  if (e.deltaMode === 1) {
    // Line mode → xấp xỉ px
    dx *= 16;
    dy *= 16;
  } else if (e.deltaMode === 2) {
    // Page mode
    dx *= window.innerHeight;
    dy *= window.innerHeight;
  }
  return { dx, dy };
}

export function CanvasSurface({ boardId }: { boardId: string }) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gridDenseRef = useRef<HTMLDivElement>(null);
  const gridSparseRef = useRef<HTMLDivElement>(null);
  const objectsMap = useObjectsStore((s) => s.objects);
  const showGrid = useCanvasSettingsStore((s) => s.showGrid);
  const gridVisibilityCls = showGrid ? '' : 'hidden';
  const [menu, setMenu] = useState<{
    screenX: number;
    screenY: number;
    canvasX: number;
    canvasY: number;
  } | null>(null);

  usePointerInteraction(surfaceRef);

  // --- Engine element registration ---
  useEffect(() => {
    const engine = getCameraEngine();
    engine.setElements({
      wrapper: wrapperRef.current,
      gridDense: gridDenseRef.current,
      gridSparse: gridSparseRef.current,
    });
    return () => {
      engine.setElements({ wrapper: null, gridDense: null, gridSparse: null });
    };
  }, []);

  // --- Viewport tracking (ResizeObserver) ---
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const engine = getCameraEngine();
    const update = () => {
      const rect = el.getBoundingClientRect();
      engine.setViewport(rect.width, rect.height);
      recomputeDynamicZoomMin();
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const mode = useInteractionStore((s) => s.mode);

  // --- Recompute dynamic zoom min + pan bounds khi objects đổi ---
  //
  // Trong lúc drag/resize, exclude object đang mutate khỏi bounds compute.
  // Nếu không, bounds "trôi" theo item (khi 1 item duy nhất, camera clamp
  // dõi theo item → mất biên chặn). Item đứng yên định biên là đúng semantics.
  const recomputeDynamicZoomMin = () => {
    const engine = getCameraEngine();
    const viewport = engine.getViewport();
    if (viewport.width === 0 || viewport.height === 0) return;
    const objects = useObjectsStore.getState().objects;
    const currentMode = useInteractionStore.getState().mode;
    const isMutating = currentMode === 'dragging' || currentMode === 'resizing';
    const selected = useSelectionStore.getState().selectedIds;
    const iter = isMutating
      ? Array.from(objects.values()).filter((o) => !selected.has(o.id))
      : Array.from(objects.values());
    const bounds = computeContentBounds(iter);
    engine.setDynamicZoomMin(computeDynamicZoomMin(bounds, viewport));
    engine.setPanBounds(computePanBounds(bounds));
  };

  useEffect(() => {
    recomputeDynamicZoomMin();
    // Cả 2 deps: objectsMap thay đổi khi drag (frame-by-frame),
    // mode thay đổi khi vào/thoát drag → recompute sau drop để pan bounds
    // ôm lại vị trí mới của item vừa move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectsMap, mode]);

  // --- Wheel handler: pan mặc định, Ctrl+wheel zoom ---
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const engine = getCameraEngine();

    const onWheel = (e: WheelEvent) => {
      const rect = el.getBoundingClientRect();
      const pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const { dx: rawDx, dy: rawDy } = normalizeWheelDelta(e);

      // Ctrl+wheel (hoặc pinch trackpad Mac = ctrlKey=true) → zoom around cursor.
      // Momentum: mỗi notch bơm impulse, engine tự glide liên tục.
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        engine.zoomImpulse(pointer, rawDy);
        return;
      }

      // Wheel = pan. Shift+wheel = pan ngang (nếu chỉ có dy).
      e.preventDefault();
      let dx = rawDx;
      let dy = rawDy;
      if (e.shiftKey && Math.abs(dx) < Math.abs(dy)) {
        dx = dy;
        dy = 0;
      }
      // panSmooth: engine ramp ~80ms → wheel notch (deltaY=100) glide thay vì jump.
      const speed = SCROLL_SPEED_FACTOR[useCanvasSettingsStore.getState().scrollSpeed];
      engine.panSmooth({ x: -dx * speed, y: -dy * speed });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Click bất kỳ đâu trong surface → activePanel = 'canvas' để Ctrl+A chọn
  // object canvas (không phải Unsort). Native listener để chạy trước logic
  // drag/pan của usePointerInteraction.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const onPointerDown = () => {
      if (useUnsortStore.getState().activePanel !== 'canvas') {
        useUnsortStore.getState().setActivePanel('canvas');
      }
    };
    el.addEventListener('pointerdown', onPointerDown);
    return () => el.removeEventListener('pointerdown', onPointerDown);
  }, []);

  // --- Context menu ---
  const onContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const camera = getCameraEngine().getCamera();
    const { x, y } = screenToCanvas({ x: screenX, y: screenY }, camera);
    setMenu({ screenX: e.clientX, screenY: e.clientY, canvasX: x, canvasY: y });
  };

  return (
    <div
      ref={surfaceRef}
      data-canvas-surface="true"
      onContextMenu={onContextMenu}
      className="relative flex-1 select-none overflow-hidden"
    >
      {/*
       * Grid 2 layer — dense + sparse. Engine viết backgroundSize/backgroundPosition/opacity
       * qua ref, cross-fade theo zoom band để dot spacing màn hình luôn ~26-52px.
       * Layer dense đặt dưới nền, layer sparse chồng lên (both absolute inset-0).
       * Nền chung ở gridBaseRef (không transform, chỉ màu).
       *
       * Opacity dot đang 30% cho giai đoạn test (bạn yêu cầu đậm lên). Sản xuất sẽ giảm lại.
       */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: 'var(--background)' }}
      />
      <div
        ref={gridDenseRef}
        className={`pointer-events-none absolute inset-0 ${gridVisibilityCls}`}
        style={{
          backgroundImage:
            'radial-gradient(circle at 4px 4px, color-mix(in srgb, var(--foreground) 9%, transparent) 3px, transparent 3.75px)',
          backgroundSize: '36px 36px',
          backgroundPosition: '0 0',
          opacity: 1,
        }}
      />
      <div
        ref={gridSparseRef}
        className={`pointer-events-none absolute inset-0 ${gridVisibilityCls}`}
        style={{
          backgroundImage:
            'radial-gradient(circle at 4px 4px, color-mix(in srgb, var(--foreground) 9%, transparent) 3px, transparent 3.75px)',
          backgroundSize: '72px 72px',
          backgroundPosition: '0 0',
          opacity: 0,
        }}
      />

      {/* World layer — engine ghi transform qua ref */}
      <div
        ref={wrapperRef}
        className="absolute left-0 top-0"
        style={{ transformOrigin: '0 0' }}
      >
        <ObjectsLayer />
      </div>

      {/* Screen space overlays */}
      <MarqueeOverlay />
      <Toolbar boardId={boardId} />
      <UnsortToggle boardId={boardId} />
      {/* Floating preview cho canvas object drag — portal body via subscribe store */}
      <CanvasObjectDragPreview />

      {menu ? (
        <ContextMenu
          x={menu.screenX}
          y={menu.screenY}
          items={[
            {
              icon: StickyNote,
              label: 'Thêm Note',
              onClick: () => createObjectAt('note', menu.canvasX, menu.canvasY, boardId),
            },
          ]}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </div>
  );
}
