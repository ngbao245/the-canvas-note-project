import { useCallback } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CanvasObject } from '../types';
import { useObjectsStore } from '../store/objects-store';
import { useSelectionStore } from '../store/selection-store';
import { useCameraStore } from '../store/camera-store';
import { useInteractionStore } from '../store/interaction-store';
import { applyMoveDelta, commitMove } from '../engine/actions';

/**
 * Render toàn bộ object trên canvas. Phase A chỉ có type='rect'.
 * Mỗi object handle pointerdown của chính nó: select + start drag.
 * Drag update store trực tiếp mỗi pointermove (đơn giản, đủ cho Phase A với <500 object).
 */
export function ObjectsLayer() {
  const objectsMap = useObjectsStore((s) => s.objects);
  const objects = Array.from(objectsMap.values());
  return (
    <>
      {objects.map((obj) => (
        <ObjectView key={obj.id} obj={obj} />
      ))}
    </>
  );
}

function ObjectView({ obj }: { obj: CanvasObject }) {
  const selected = useSelectionStore((s) => s.selectedIds.has(obj.id));

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Modifier pan (Space, middle, Ctrl) → bỏ qua, để surface xử pan.
      if (e.button === 1 || e.ctrlKey || e.metaKey) return;
      e.stopPropagation();
      const sel = useSelectionStore.getState();
      const cam = useCameraStore.getState().camera;

      // Chọn object: shift toggle, else replace nếu chưa select.
      if (e.shiftKey) {
        sel.toggle(obj.id);
      } else if (!sel.selectedIds.has(obj.id)) {
        sel.select(obj.id);
      }

      // Nếu sau chọn xong object không còn được select (shift+click bỏ) → không drag.
      const idsToMove = Array.from(useSelectionStore.getState().selectedIds);
      if (idsToMove.length === 0 || !idsToMove.includes(obj.id)) return;

      // Start drag. Snapshot vị trí ban đầu để commit MoveCommand khi kết thúc.
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      useInteractionStore.getState().setMode('dragging');

      const before = new Map<string, { x: number; y: number }>();
      for (const id of idsToMove) {
        const o = useObjectsStore.getState().objects.get(id);
        if (o) before.set(id, { x: o.geometry.x, y: o.geometry.y });
      }

      let lastClientX = e.clientX;
      let lastClientY = e.clientY;

      const onMove = (ev: PointerEvent) => {
        const dx = (ev.clientX - lastClientX) / cam.zoom;
        const dy = (ev.clientY - lastClientY) / cam.zoom;
        lastClientX = ev.clientX;
        lastClientY = ev.clientY;
        applyMoveDelta(idsToMove, dx, dy);
      };
      const onUp = (ev: PointerEvent) => {
        target.releasePointerCapture(ev.pointerId);
        useInteractionStore.getState().setMode('idle');
        // Snapshot vị trí sau và push MoveCommand.
        const after = new Map<string, { x: number; y: number }>();
        for (const id of idsToMove) {
          const o = useObjectsStore.getState().objects.get(id);
          if (o) after.set(id, { x: o.geometry.x, y: o.geometry.y });
        }
        commitMove(before, after);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [obj.id],
  );

  return (
    <div
      data-object-id={obj.id}
      onPointerDown={onPointerDown}
      className="absolute cursor-move"
      style={{
        left: obj.geometry.x,
        top: obj.geometry.y,
        width: obj.geometry.width,
        height: obj.geometry.height,
        zIndex: obj.geometry.zIndex,
      }}
    >
      <RectRenderer selected={selected} />
    </div>
  );
}

/** Renderer cho type='rect' — div phẳng nền primary-soft, border primary. */
function RectRenderer({ selected }: { selected: boolean }) {
  return (
    <div
      className="h-full w-full rounded-md"
      style={{
        background: 'var(--primary-soft)',
        border: `2px solid ${selected ? 'var(--primary)' : 'var(--primary-hover)'}`,
      }}
    />
  );
}
