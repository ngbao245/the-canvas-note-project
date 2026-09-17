import type { PointerEvent as ReactPointerEvent } from 'react';
import { useObjectsStore } from '../store/objects-store';
import { useSelectionStore } from '../store/selection-store';
import { useCameraStore } from '../store/camera-store';
import { useInteractionStore, type ResizeHandle } from '../store/interaction-store';
import { applyResize, commitResize } from '../engine/actions';
import { MIN_OBJECT_SIZE } from '../types';

/**
 * Render outline + 8 resize handles quanh mỗi object đang select.
 * Phase A resize 1 object 1 lần (multi-resize để Phase C).
 * Handles nằm trong world layer nên tự scale theo camera — bù kích thước qua 1/zoom
 * để handles giữ size cố định trên màn hình.
 */

const HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export function SelectionLayer() {
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const objects = useObjectsStore((s) => s.objects);
  const zoom = useCameraStore((s) => s.camera.zoom);

  if (selectedIds.size === 0) return null;

  const items: { id: string; g: { x: number; y: number; width: number; height: number } }[] = [];
  for (const id of selectedIds) {
    const o = objects.get(id);
    if (o) items.push({ id, g: o.geometry });
  }

  return (
    <>
      {items.map(({ id, g }) => (
        <SelectionBox key={id} id={id} geometry={g} zoom={zoom} single={selectedIds.size === 1} />
      ))}
    </>
  );
}

function SelectionBox({
  id,
  geometry,
  zoom,
  single,
}: {
  id: string;
  geometry: { x: number; y: number; width: number; height: number };
  zoom: number;
  single: boolean;
}) {
  const border = 2 / zoom;
  const handleSize = 10 / zoom;

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: geometry.x - border,
        top: geometry.y - border,
        width: geometry.width + border * 2,
        height: geometry.height + border * 2,
        border: `${border}px solid var(--primary)`,
      }}
    >
      {/* Chỉ hiện resize handle khi có 1 object select (đơn giản Phase A) */}
      {single &&
        HANDLES.map((h) => (
          <Handle key={h} handle={h} objectId={id} size={handleSize} zoom={zoom} />
        ))}
    </div>
  );
}

const CURSOR_BY_HANDLE: Record<ResizeHandle, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
};

function Handle({
  handle,
  objectId,
  size,
  zoom,
}: {
  handle: ResizeHandle;
  objectId: string;
  size: number;
  zoom: number;
}) {
  // Position handle theo compass point trên border của SelectionBox.
  const pos: React.CSSProperties = {
    width: size,
    height: size,
    background: 'var(--primary)',
    border: `${1 / zoom}px solid var(--card)`,
    borderRadius: '50%',
    cursor: CURSOR_BY_HANDLE[handle],
    position: 'absolute',
    pointerEvents: 'auto',
  };
  const half = size / 2;
  if (handle.includes('n')) pos.top = -half;
  else if (handle.includes('s')) pos.bottom = -half;
  else pos.top = `calc(50% - ${half}px)`;
  if (handle.includes('w')) pos.left = -half;
  else if (handle.includes('e')) pos.right = -half;
  else pos.left = `calc(50% - ${half}px)`;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    useInteractionStore.getState().setMode('resizing');
    useInteractionStore.getState().setResizeHandle(handle);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const start = useObjectsStore.getState().objects.get(objectId);
    if (!start) return;
    const g0 = start.geometry;

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startClientX) / zoom;
      const dy = (ev.clientY - startClientY) / zoom;

      let x = g0.x;
      let y = g0.y;
      let w = g0.width;
      let h = g0.height;

      if (handle.includes('e')) w = Math.max(MIN_OBJECT_SIZE, g0.width + dx);
      if (handle.includes('s')) h = Math.max(MIN_OBJECT_SIZE, g0.height + dy);
      if (handle.includes('w')) {
        const newW = Math.max(MIN_OBJECT_SIZE, g0.width - dx);
        x = g0.x + (g0.width - newW);
        w = newW;
      }
      if (handle.includes('n')) {
        const newH = Math.max(MIN_OBJECT_SIZE, g0.height - dy);
        y = g0.y + (g0.height - newH);
        h = newH;
      }

      applyResize(objectId, { x, y, width: w, height: h });
    };
    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      useInteractionStore.getState().setMode('idle');
      useInteractionStore.getState().setResizeHandle(null);
      // Push ResizeCommand.
      const end = useObjectsStore.getState().objects.get(objectId);
      if (end) commitResize(objectId, g0, end.geometry);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return <div style={pos} onPointerDown={onPointerDown} />;
}
