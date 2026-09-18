import { useEffect, type RefObject } from 'react';
import { useSelectionStore } from '../store/selection-store';
import { useObjectsStore } from '../store/objects-store';
import { useInteractionStore } from '../store/interaction-store';
import { getCameraEngine } from '../engine/camera-engine';
import { screenToCanvas, aabbIntersect } from '../engine/coord';
import { isEditableTarget } from '../lib/dom';

/**
 * Pointer interaction trên canvas surface. Object tự xử pointerdown trong
 * ObjectsLayer (stopPropagation). Surface xử:
 *   - Pan: Space+drag, middle mouse, Ctrl/Cmd+drag → engine.pan (immediate, 1:1)
 *   - Marquee select: drag vùng trống (không modifier)
 *   - Click vùng trống (không drag) → clear selection
 */
export function usePointerInteraction(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let spacePressed = false;
    let panStart: { x: number; y: number } | null = null;
    let marqueeStart: { x: number; y: number; shift: boolean } | null = null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isEditableTarget(e.target)) {
        spacePressed = true;
        el.style.cursor = 'grab';
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressed = false;
        el.style.cursor = '';
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      // Bỏ qua nếu pointerdown xuất phát từ object hoặc overlay screen-space
      // (toolbar palette, pill...). React synthetic stopPropagation KHÔNG chặn
      // được native listener này (surface nằm giữa target và React root), nên
      // phải guard bằng target — nếu không, kéo object sẽ chạy song song marquee.
      if (
        e.target instanceof Element &&
        e.target.closest('[data-object-id], [data-canvas-overlay]')
      ) {
        return;
      }
      const isMiddle = e.button === 1;
      const isCtrl = e.ctrlKey || e.metaKey;
      const shouldPan = spacePressed || isMiddle || (isCtrl && e.button === 0);

      if (shouldPan) {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        panStart = { x: e.clientX, y: e.clientY };
        useInteractionStore.getState().setMode('panning');
        el.style.cursor = 'grabbing';
        return;
      }

      if (e.button === 0) {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        const rect = el.getBoundingClientRect();
        marqueeStart = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          shift: e.shiftKey,
        };
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (panStart) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        panStart = { x: e.clientX, y: e.clientY };
        // Engine.pan applies immediate 1:1 hand movement (không ramp).
        getCameraEngine().pan({ x: dx, y: dy });
        return;
      }
      if (marqueeStart) {
        const rect = el.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const x = Math.min(marqueeStart.x, cx);
        const y = Math.min(marqueeStart.y, cy);
        const w = Math.abs(cx - marqueeStart.x);
        const h = Math.abs(cy - marqueeStart.y);
        if (w > 3 || h > 3) {
          useInteractionStore.getState().setMode('marquee');
          useInteractionStore.getState().setMarqueeRect({ x, y, width: w, height: h });
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (panStart) {
        el.releasePointerCapture(e.pointerId);
        panStart = null;
        useInteractionStore.getState().setMode('idle');
        el.style.cursor = spacePressed ? 'grab' : '';
        return;
      }
      if (marqueeStart) {
        el.releasePointerCapture(e.pointerId);
        const inter = useInteractionStore.getState();
        const rect = inter.marqueeRect;

        if (rect && inter.mode === 'marquee') {
          const camera = getCameraEngine().getCamera();
          const p1 = screenToCanvas({ x: rect.x, y: rect.y }, camera);
          const p2 = screenToCanvas(
            { x: rect.x + rect.width, y: rect.y + rect.height },
            camera,
          );
          const canvasRect = {
            x: Math.min(p1.x, p2.x),
            y: Math.min(p1.y, p2.y),
            width: Math.abs(p2.x - p1.x),
            height: Math.abs(p2.y - p1.y),
          };
          const hits: string[] = [];
          for (const [id, obj] of useObjectsStore.getState().objects) {
            if (aabbIntersect(canvasRect, obj.geometry)) hits.push(id);
          }
          if (marqueeStart.shift) useSelectionStore.getState().addToSelection(hits);
          else useSelectionStore.getState().replace(hits);
        } else {
          if (!marqueeStart.shift) useSelectionStore.getState().clear();
        }

        inter.setMode('idle');
        inter.setMarqueeRect(null);
        marqueeStart = null;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, [ref]);
}
