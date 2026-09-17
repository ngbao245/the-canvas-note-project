import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Square } from 'lucide-react';
import { useObjectsStore } from '../store/objects-store';
import { getCameraEngine } from '../engine/camera-engine';
import { screenToCanvas } from '../engine/coord';
import { createRectAt } from '../engine/actions';
import { usePointerInteraction } from '../hooks/usePointerInteraction';
import {
  computeContentBounds,
  computeDynamicZoomMin,
  computePanBounds,
} from '../lib/content-bounds';
import { ObjectsLayer } from './ObjectsLayer';
import { SelectionLayer } from './SelectionLayer';
import { MarqueeOverlay } from './MarqueeOverlay';
import { ContextMenu } from './ContextMenu';

/**
 * CanvasSurface — khung nhận wheel/pointer, đăng ký DOM refs với CameraEngine.
 *
 * Wheel convention (Milanote/Figma):
 *   - Wheel = pan (dọc). Shift+wheel = pan ngang. Ctrl+wheel = zoom around cursor.
 *   - Trackpad pinch trên Mac tự có ctrlKey=true (browser convention) → zoom.
 *
 * Constants:
 *   - WHEEL_ZOOM_K = 600 → factor = exp(-deltaY/600), deltaY=100 ≈ -15% per notch.
 *   - WHEEL_ZOOM_CLAMP = 50 → cap deltaY tránh trackpad flick jump zoom nhiều bậc.
 *   - WHEEL_PAN_SPEED = 0.5 → giảm khoảng cách pan per notch (deltaY=100 → 50px).
 *
 * ResizeObserver track viewport, recompute dynamic zoom min + pan bounds mỗi khi
 * objects hoặc viewport đổi.
 */

const WHEEL_ZOOM_K = 600;
const WHEEL_ZOOM_CLAMP = 50;
const WHEEL_PAN_SPEED = 0.5;

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

export function CanvasSurface({ boardId }: { boardId: string | null }) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gridDenseRef = useRef<HTMLDivElement>(null);
  const gridSparseRef = useRef<HTMLDivElement>(null);
  const objectsMap = useObjectsStore((s) => s.objects);
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

  // --- Recompute dynamic zoom min + pan bounds khi objects đổi ---
  const recomputeDynamicZoomMin = () => {
    const engine = getCameraEngine();
    const viewport = engine.getViewport();
    if (viewport.width === 0 || viewport.height === 0) return;
    const objects = useObjectsStore.getState().objects;
    const bounds = computeContentBounds(objects.values());
    engine.setDynamicZoomMin(computeDynamicZoomMin(bounds, viewport));
    engine.setPanBounds(computePanBounds(bounds));
  };

  useEffect(() => {
    recomputeDynamicZoomMin();
  }, [objectsMap]);

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
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const clampedDy = Math.max(-WHEEL_ZOOM_CLAMP, Math.min(WHEEL_ZOOM_CLAMP, rawDy));
        const factor = Math.exp(-clampedDy / WHEEL_ZOOM_K);
        engine.zoomByAt(pointer, factor);
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
      engine.panSmooth({ x: -dx * WHEEL_PAN_SPEED, y: -dy * WHEEL_PAN_SPEED });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
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
        className="pointer-events-none absolute inset-0"
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
        className="pointer-events-none absolute inset-0"
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
        <SelectionLayer />
      </div>

      {/* Screen space overlays */}
      <MarqueeOverlay />

      {menu ? (
        <ContextMenu
          x={menu.screenX}
          y={menu.screenY}
          items={[
            {
              icon: Square,
              label: 'Add rect',
              onClick: () => createRectAt(menu.canvasX, menu.canvasY, boardId),
            },
          ]}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </div>
  );
}
