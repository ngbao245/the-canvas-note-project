import type { PointerEvent as ReactPointerEvent } from 'react';
import { useObjectsStore } from '../store/objects-store';
import { useSelectionStore } from '../store/selection-store';
import { useCameraStore } from '../store/camera-store';
import { useInteractionStore, type ResizeHandle } from '../store/interaction-store';
import { applyResize, commitResize } from '../engine/actions';
import { getObjectTypeDefinition } from '../hooks/useObjectRegistry';
import { MIN_OBJECT_SIZE } from '../types';

/**
 * SelectionLayer — Milanote-style. Khi 1 object selected, render:
 *   - Outline box quanh card (ring primary, bù zoom)
 *   - QuickLineDot top-right (visual placeholder — drag logic Phase C, xem
 *     `.kiro/notes/canvas-backlog.md` mục 1)
 *   - Corner resize handle SVG bottom-right (SE only, Milanote parity):
 *     drag = resize width + height. Cạnh trên/trái/phải không có handle
 *     (đúng Milanote). Muốn thu nhỏ = drag corner về trong.
 *
 * Trade-off khi bỏ 7 handle: mất resize từ cạnh riêng. User đã confirm OK.
 * Multi-select resize: Phase C (chưa hỗ trợ ở đây).
 */

export function SelectionLayer() {
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const objects = useObjectsStore((s) => s.objects);
  const zoom = useCameraStore((s) => s.camera.zoom);
  const mode = useInteractionStore((s) => s.mode);

  if (selectedIds.size === 0) return null;
  // Khi drag: viền không vẽ trong world (item hidden + geometry chạy ngầm theo
  // cursor). Preview floating body đã có viền qua Renderer với isSelected=true.
  // Nếu vẫn vẽ ở đây → viền world (transform scale) + viền preview (screen-space)
  // hiện đôi, lệch nhau khi zoom ≠ 100%. Drop → mode='idle' → viền hiện lại
  // quanh vị trí mới. RULE CỨNG: viền canvas selection luôn theo item, không
  // được tồn tại "trần" trong world khi item hidden.
  if (mode === 'dragging') return null;

  const items: { id: string; g: { x: number; y: number; width: number; height: number } }[] = [];
  for (const id of selectedIds) {
    const o = objects.get(id);
    // Skip object trong Unsort (unsortIndex !== null): không render selection
    // box trên canvas. UnsortItem tự highlight qua ring primary trong panel.
    if (o && o.unsortIndex === null) items.push({ id, g: o.geometry });
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
  // border 2/zoom → luôn 2px screen. Handle/dot size cũng bù zoom để giữ constant screen.
  const border = 2 / zoom;

  return (
    <div
      // data-canvas-overlay: canvas surface pointerdown listener (usePointerInteraction)
      // guard check attribute này để KHÔNG kích marquee mode khi user click vào
      // handle/dot bên trong. Native listener không tôn trọng React stopPropagation.
      data-canvas-overlay="true"
      className="pointer-events-none absolute"
      style={{
        left: geometry.x - border,
        top: geometry.y - border,
        width: geometry.width + border * 2,
        height: geometry.height + border * 2,
        border: `${border}px solid var(--primary)`,
        borderRadius: `${6 / zoom}px`, // match rounded-sm của ObjectShell
        // z-canvas-selection (500) — trên object (geometry.zIndex 100-500 typical).
        // Không set → default auto (0) → item card render lên trên → border/dot/
        // resize SVG bị che. Token định nghĩa trong index.css.
        zIndex: 'var(--z-canvas-selection)',
      }}
    >
      {/* Chỉ hiện handle + dot khi 1 object select (Phase A single-resize). */}
      {single ? (
        <>
          <QuickLineDot zoom={zoom} />
          <CornerResizeHandle objectId={id} zoom={zoom} />
        </>
      ) : null}
    </div>
  );
}

/**
 * QuickLineDot — chấm nhỏ top-right, hint kéo tạo line/arrow (Milanote pattern).
 * Phase B: visual only. Drag logic + LineObject → Phase C (xem backlog).
 * White circle 12px screen-space, subtle drop shadow. pointer-events-none.
 */
function QuickLineDot({ zoom }: { zoom: number }) {
  const size = 12 / zoom;
  const offset = 6 / zoom; // nhô ra ngoài SelectionBox góc NE
  return (
    <div
      className="pointer-events-none absolute rounded-full bg-card"
      style={{
        top: -offset,
        right: -offset,
        width: size,
        height: size,
        border: `${2 / zoom}px solid var(--primary)`,
        boxShadow: 'var(--shadow-elevation-1)',
      }}
      aria-hidden="true"
    />
  );
}

/**
 * CornerResizeHandle — SVG grip Milanote-style góc phải dưới. Drag resize
 * width + height (chỉ SE direction). x/y không đổi khi drag → card growth
 * from top-left corner.
 *
 * SVG: 3 đường chéo dark 50% + 3 đường trắng 70% offset → hiệu ứng grip 3D.
 */
function CornerResizeHandle({ objectId, zoom }: { objectId: string; zoom: number }) {
  const size = 16 / zoom;
  const offset = 4 / zoom; // 4px screen từ cạnh card

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    useInteractionStore.getState().setMode('resizing');
    useInteractionStore.getState().setResizeHandle('se' as ResizeHandle);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const start = useObjectsStore.getState().objects.get(objectId);
    if (!start) return;
    const g0 = start.geometry;
    const def = getObjectTypeDefinition(start.type);

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startClientX) / zoom;
      const dy = (ev.clientY - startClientY) / zoom;
      const w = Math.max(MIN_OBJECT_SIZE, g0.width + dx);
      const h = Math.max(MIN_OBJECT_SIZE, g0.height + dy);
      applyResize(objectId, { x: g0.x, y: g0.y, width: w, height: h });
    };
    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      useInteractionStore.getState().setMode('idle');
      useInteractionStore.getState().setResizeHandle(null);
      const end = useObjectsStore.getState().objects.get(objectId);
      if (end) {
        commitResize(objectId, g0, end.geometry);
        // Type-specific post-processing (VD Note lock heightMode='fixed' sau
        // drag). Chỉ gọi nếu geometry thực sự đổi để tránh side effect thừa.
        const changed =
          g0.width !== end.geometry.width || g0.height !== end.geometry.height;
        if (changed) def?.onResizeCommit?.(objectId, g0, end.geometry);
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        bottom: offset,
        right: offset,
        width: size,
        height: size,
        cursor: 'nwse-resize',
        pointerEvents: 'auto',
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" aria-hidden>
        {/* Layer dưới: dark path, opacity 50% — bóng đổ */}
        <path
          d="M13.146 12.146a.5.5 0 0 1 .708.708l-1 1a.5.5 0 0 1-.708-.708zm0-4a.5.5 0 0 1 .708.708l-5 5a.5.5 0 0 1-.708-.708zm0-4a.5.5 0 0 1 .708.708l-9 9a.5.5 0 0 1-.708-.708z"
          fill="var(--foreground)"
          fillOpacity="0.5"
        />
        {/* Layer trên: light path, opacity 70% offset 1px — highlight 3D */}
        <path
          d="M13.146 6.146a.5.5 0 0 1 .708.708l-7 7a.5.5 0 0 1-.708-.708zm0-4a.5.5 0 0 1 .708.708l-11 11a.5.5 0 0 1-.708-.708zm0 8a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708-.708z"
          fill="var(--card)"
          fillOpacity="0.7"
        />
      </svg>
    </div>
  );
}
