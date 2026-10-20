import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { StickyNote } from 'lucide-react';
import { useObjectsStore } from '../store/objects-store';
import { useInteractionStore } from '../store/interaction-store';
import { useSelectionStore } from '../store/selection-store';
import { useUnsortStore } from '../store/unsort-store';
import {
  SCROLL_SPEED_FACTOR,
  TOUCHPAD_SPEED_FACTOR,
  useCanvasSettingsStore,
} from '@/stores/canvas-settings-store';
import { isZoomWheel } from '@/lib/shortcuts';
import { useInterfaceStore } from '@/stores/interface-store';
import { getCameraEngine } from '../engine/camera-engine';
import { createWheelClassifier } from '../lib/wheel-input';
import { screenToCanvas } from '../engine/coord';
import { createObjectAt } from '../engine/actions';
import { usePointerInteraction } from '../hooks/usePointerInteraction';
import { computeContentBounds, computeDynamicZoomMin } from '../lib/content-bounds';
import { ObjectsLayer } from './ObjectsLayer';
import { MarqueeOverlay } from './MarqueeOverlay';
import { ContextMenu } from './ContextMenu';
import { Toolbar } from './Toolbar';
import { UnsortToggle } from './UnsortPanel';
import { CanvasScrollbars } from './CanvasScrollbars';
import { CanvasObjectDragPreview } from './CanvasObjectDragPreview';
import { CanvasNotice } from './CanvasNotice';
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
      syncCameraConstraints();
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const mode = useInteractionStore((s) => s.mode);
  // Đổi Kích thước giao diện → fit zoom đổi theo → tính lại zoom min. Engine tự đổi scale qua store.
  const interfaceSize = useInterfaceStore((s) => s.size);

  // --- Ràng buộc camera (zoom min, vùng tài liệu, điểm hút zoom) khi objects đổi ---
  //
  // Vùng tài liệu tính từ MỌI object, gồm object đang kéo / resize: kéo ra xa là
  // tài liệu giãn theo (engine chỉ giãn, không co → camera không dõi theo item).
  // Zoom min + điểm hút zoom vẫn bỏ object đang mutate (item đứng yên định mức).
  const syncCameraConstraints = () => {
    const engine = getCameraEngine();
    const viewport = engine.getViewport();
    if (viewport.width === 0 || viewport.height === 0) return;
    const { objects, loadedBoardId } = useObjectsStore.getState();
    const currentMode = useInteractionStore.getState().mode;
    const isMutating = currentMode === 'dragging' || currentMode === 'resizing';
    const selected = useSelectionStore.getState().selectedIds;
    const all = Array.from(objects.values());
    const still = isMutating ? all.filter((o) => !selected.has(o.id)) : all;
    const stillBounds = computeContentBounds(still);
    engine.setDynamicZoomMin(
      computeDynamicZoomMin(stillBounds, viewport, engine.getInterfaceScale()),
    );
    // loadedBoardId: lúc chờ nạp board mới, store còn object board cũ → engine bỏ qua.
    // Không kéo / resize thì `still` = `all` → dùng lại khung vừa tính (chạy mỗi phím).
    engine.setPanBounds(isMutating ? computeContentBounds(all) : stillBounds, loadedBoardId);
    // Cùng tập object với khung nội dung: bỏ item Khay chờ (INV-CANVAS-18).
    engine.setAttractRects(still.filter((o) => o.unsortIndex === null).map((o) => o.geometry));
  };

  // Objects đổi (kéo từng frame, gõ chữ) → tính lại qua subscribe, không render lại
  // cả CanvasSurface (và ObjectsLayer, Toolbar bên trong) mỗi phím.
  useEffect(
    () =>
      useObjectsStore.subscribe((s, prev) => {
        if (s.objects !== prev.objects) syncCameraConstraints();
      }),
    // Không cần deps: recompute chỉ đọc getState(), không giữ giá trị render.
    [],
  );

  useEffect(() => {
    syncCameraConstraints();
    // mode đổi khi vào/thoát kéo → tính lại sau khi thả: zoom min + điểm hút gồm
    // lại item vừa di chuyển.
  }, [mode, interfaceSize]);

  // --- Wheel handler: pan mặc định, Ctrl+wheel zoom ---
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const engine = getCameraEngine();
    const classify = createWheelClassifier();

    const onWheel = (e: WheelEvent) => {
      const rect = el.getBoundingClientRect();
      const pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const { dx: rawDx, dy: rawDy } = normalizeWheelDelta(e);
      const touchpad = classify(e, e.timeStamp) === 'touchpad';

      // Ctrl+wheel (hoặc pinch touchpad, trình duyệt gửi ctrlKey=true) → zoom quanh con trỏ.
      // Touchpad → zoom liên tục, áp thẳng; chuột → 1 nấc / sự kiện.
      if (isZoomWheel(e)) {
        e.preventDefault();
        if (touchpad) engine.zoomContinuous(pointer, rawDy);
        else engine.zoomImpulse(pointer, rawDy);
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
      const scrollSpeed = useCanvasSettingsStore.getState().scrollSpeed;
      if (touchpad) {
        // Touchpad: theo ngón tay ngay, không ramp.
        const speed = TOUCHPAD_SPEED_FACTOR[scrollSpeed];
        engine.panDirect({ x: -dx * speed, y: -dy * speed });
        return;
      }
      // Chuột: ramp → nấc lăn (deltaY=100) trượt thay vì nhảy.
      const speed = SCROLL_SPEED_FACTOR[scrollSpeed];
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
      <CanvasScrollbars />
      <Toolbar boardId={boardId} />
      <UnsortToggle boardId={boardId} />
      <CanvasNotice />
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
