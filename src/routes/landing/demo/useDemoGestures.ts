import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { isMacSecondaryClick, isZoomWheel } from '@/lib/shortcuts';
import { setCursorOverride } from '@/lib/cursor-override';
import { isEditableTarget } from '@/lib/dom';
import { useDemoStore } from './demo-store';
import { zoomAroundPoint } from './demo-camera';

/**
 * Chuột trên canvas mini:
 *   - Lăn kèm Ctrl / Cmd hoặc pinch: zoom quanh con trỏ. Lăn thường: pan.
 *   - Nhấn trên object: chọn + đưa lên trên, kéo quá ngưỡng thì object đi theo.
 *     Nhấn 2 lần liền trên cùng object (không kéo) = vào sửa chữ.
 *   - Nhấn vùng trống: bỏ chọn + pan.
 * Chỉ bắt wheel khi khung đang bật, để lúc nghỉ lăn chuột vẫn cuộn trang.
 *
 * Không dùng sự kiện dblclick: surface giữ pointer capture nên dblclick rơi vào
 * surface chứ không vào object, nên tự đo 2 lần nhấn.
 */

type Gesture =
  | { kind: 'pan'; pointerId: number; startX: number; startY: number; camX: number; camY: number }
  | {
      kind: 'object';
      pointerId: number;
      id: string;
      startX: number;
      startY: number;
      objX: number;
      objY: number;
      moved: boolean;
    };

/** Dưới ngưỡng này là bấm (grabbed), chưa phải kéo. */
const DRAG_THRESHOLD = 4;
const DOUBLE_PRESS_MS = 400;
/** Một nấc chuột (~100) đổi zoom ~22%. Pinch trackpad gửi delta nhỏ nên mượt. */
const ZOOM_SPEED = 0.0025;
const LINE_HEIGHT_PX = 16;

export function useDemoGestures(surfaceRef: RefObject<HTMLDivElement | null>, active: boolean) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const lastPress = useRef<{ id: string; time: number } | null>(null);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el || !active) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scale = e.deltaMode === 1 ? LINE_HEIGHT_PX : 1;
      const { camera, setCamera } = useDemoStore.getState();
      if (isZoomWheel(e)) {
        const rect = el.getBoundingClientRect();
        const factor = Math.exp(-e.deltaY * scale * ZOOM_SPEED);
        setCamera(
          zoomAroundPoint(camera, e.clientX - rect.left, e.clientY - rect.top, camera.zoom * factor),
        );
        return;
      }
      setCamera({ ...camera, x: camera.x - e.deltaX * scale, y: camera.y - e.deltaY * scale });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      setCursorOverride(null, el);
    };
  }, [surfaceRef, active]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || isMacSecondaryClick(e)) return;
    const target = e.target instanceof Element ? e.target : null;
    // Ô sửa chữ và nút trong card (Mở nguồn) tự xử chuột.
    if (isEditableTarget(target) || target?.closest('button')) return;
    e.preventDefault();
    const el = e.currentTarget;
    const store = useDemoStore.getState();
    const objEl = target?.closest<HTMLElement>('[data-demo-object-id]');
    const obj = objEl ? store.objects.find((o) => o.id === objEl.dataset.demoObjectId) : undefined;
    if (store.editingId && store.editingId !== obj?.id) store.finishEdit();
    if (obj && store.editingId === obj.id) return; // bấm viền card đang sửa: giữ nguyên
    el.setPointerCapture(e.pointerId);

    if (obj) {
      store.select(obj.id);
      store.bringToFront(obj.id);
      const prev = lastPress.current;
      if (prev && prev.id === obj.id && e.timeStamp - prev.time < DOUBLE_PRESS_MS) {
        lastPress.current = null;
        store.startEdit(obj.id);
        return;
      }
      lastPress.current = { id: obj.id, time: e.timeStamp };
      gesture.current = {
        kind: 'object',
        pointerId: e.pointerId,
        id: obj.id,
        startX: e.clientX,
        startY: e.clientY,
        objX: obj.x,
        objY: obj.y,
        moved: false,
      };
      return;
    }

    lastPress.current = null;
    store.select(null);
    gesture.current = {
      kind: 'pan',
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      camX: store.camera.x,
      camY: store.camera.y,
    };
    setCursorOverride('grabbing', el);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    const store = useDemoStore.getState();

    if (g.kind === 'pan') {
      store.setCamera({ ...store.camera, x: g.camX + dx, y: g.camY + dy });
      return;
    }
    if (!g.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      g.moved = true;
      lastPress.current = null; // đã kéo thì lần nhấn này không tính vào nhấn đúp
      store.record();
      setDraggingId(g.id);
    }
    const zoom = store.camera.zoom;
    store.moveObject(g.id, g.objX + dx / zoom, g.objY + dy / zoom);
  };

  const endGesture = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gesture.current = null;
    setDraggingId(null);
    setCursorOverride(null, e.currentTarget);
  };

  return {
    draggingId,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endGesture,
      onPointerCancel: endGesture,
    },
  };
}
