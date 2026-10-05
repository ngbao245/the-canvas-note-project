import { useCallback, useRef, useState, type ReactElement, type PointerEvent as ReactPointerEvent } from 'react';
import { getCameraEngine } from '../engine/camera-engine';
import { hitZone, isInvalidZone, isSecondaryZone } from '../lib/hit-test';
import type { DefaultGeometry } from './useObjectRegistry';
import type { CanvasObject } from '../types';
import { FloatingObjectPreview } from '../components/FloatingObjectPreview';

/**
 * Pointer-based drag cho toolbar palette. Milanote parity: preview trông y hệt
 * object thật (render bằng registry Renderer qua FloatingObjectPreview shared),
 * follow cursor. Chỉ tạo object khi drop trên canvas — drop invalid = silent.
 *
 * Cơ chế:
 *   - pointerdown → ghi start point + grab offset (center preview).
 *   - pointermove vượt DRAG_THRESHOLD → state active, render FloatingObjectPreview.
 *   - pointerup:
 *       + Chưa vượt threshold → onClick (tạo ở tâm viewport).
 *       + Drop canvas → onDrop(clientX, clientY).
 *       + Drop invalid (overlay/outside) → silent cancel.
 *       + Drop trash/unsort → silent cancel (toolbar chỉ tạo trên canvas).
 *
 * Cursor block dùng isInvalidZone (overlay/outside) — chung semantics với canvas
 * drag + unsort drag. Trash/unsort không kích cursor block, nhưng toolbar drop
 * ở đó vẫn silent vì semantic tạo-object chỉ hợp với canvas trống.
 */

const DRAG_THRESHOLD = 5;

interface PreviewState {
  clientX: number;
  clientY: number;
  /** Cursor offset tới top-left preview trong PREVIEW-space. Toolbar dùng center
   *  preview (user cầm nút toolbar, không có grab point cụ thể). */
  grabOffsetX: number;
  grabOffsetY: number;
  /** Cursor ở vùng khác canvas trống → dim preview để feedback "chỗ này khác
   *  drop-canvas-thường". */
  dim: boolean;
}

export function useToolbarDrag(opts: {
  type: string;
  onClick: () => void;
  onDrop: (clientX: number, clientY: number) => void;
  defaultGeometry: DefaultGeometry;
  defaultData: () => unknown;
}): { onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void; preview: ReactElement | null } {
  const [state, setState] = useState<PreviewState | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);

  const cleanup = useCallback(() => {
    startRef.current = null;
    draggingRef.current = false;
    document.body.classList.remove('canvas-drag-invalid');
    setState(null);
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      startRef.current = { x: e.clientX, y: e.clientY };
      draggingRef.current = false;

      // Preview center = grab offset. Cursor giữ ở giữa preview vì user cầm nút
      // toolbar, không có grab point ổn định.
      const zoom = getCameraEngine().getCamera().zoom;
      const grabOffsetX = (opts.defaultGeometry.width * zoom) / 2;
      const grabOffsetY = (opts.defaultGeometry.height * zoom) / 2;

      const onMove = (ev: PointerEvent) => {
        const s = startRef.current;
        if (!s) return;
        if (!draggingRef.current) {
          const dx = ev.clientX - s.x;
          const dy = ev.clientY - s.y;
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          draggingRef.current = true;
        }
        // Cursor block ở overlay/outside — chung semantics với 3 case. Trash/unsort
        // không block (drop silent nhưng không phải "sai"). isSecondaryZone dùng
        // để dim (rộng hơn: bao gồm trash/unsort/board-tile — chỗ "khác canvas
        // trống").
        const zone = hitZone(ev.clientX, ev.clientY);
        document.body.classList.toggle('canvas-drag-invalid', isInvalidZone(zone));
        setState({
          clientX: ev.clientX,
          clientY: ev.clientY,
          grabOffsetX,
          grabOffsetY,
          dim: isSecondaryZone(ev.clientX, ev.clientY),
        });
      };

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);

        const wasDragging = draggingRef.current;
        cleanup();

        if (!wasDragging) {
          opts.onClick();
          return;
        }
        if (hitZone(ev.clientX, ev.clientY) === 'canvas') {
          opts.onDrop(ev.clientX, ev.clientY);
        }
        // Drop trash/unsort/overlay/outside → silent.
      };

      const onCancel = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        cleanup();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    },
    [cleanup, opts],
  );

  // Mock CanvasObject dựng từ defaultGeometry + defaultData → FloatingObjectPreview
  // render bằng registry Renderer, trông identical với object thật khi drop.
  const preview: ReactElement | null = state
    ? (() => {
        const mockObject: CanvasObject = {
          id: '__toolbar_preview__',
          type: opts.type,
          boardId: '', // preview không thuộc board nào
          geometry: {
            x: 0,
            y: 0,
            width: opts.defaultGeometry.width,
            height: opts.defaultGeometry.height,
            rotation: opts.defaultGeometry.rotation ?? 0,
            zIndex: opts.defaultGeometry.zIndex ?? 0,
          },
          data: opts.defaultData(),
          unsortIndex: null,
        } as CanvasObject;
        return (
          <FloatingObjectPreview
            object={mockObject}
            clientX={state.clientX}
            clientY={state.clientY}
            grabOffsetX={state.grabOffsetX}
            grabOffsetY={state.grabOffsetY}
            dim={state.dim}
          />
        );
      })()
    : null;

  return { onPointerDown, preview };
}
