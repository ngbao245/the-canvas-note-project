import type { PointerEvent as ReactPointerEvent } from 'react';
import { useObjectsStore } from '../store/objects-store';
import { useSelectionStore } from '../store/selection-store';
import { useCameraStore } from '../store/camera-store';
import { useInteractionStore, type ResizeHandle } from '../store/interaction-store';
import { applyResize, commitResize } from '../engine/actions';
import { getObjectTypeDefinition } from '../hooks/useObjectRegistry';
import { MIN_OBJECT_SIZE } from '../types';

/**
 * SelectionBox — viền chọn Milanote-style, render BÊN TRONG khối card
 * (ObjectView), không phải tầng riêng. Gồm:
 *   - Outline quanh card (primary, bù zoom → luôn 2px màn hình)
 *   - QuickLineDot top-right (visual placeholder — drag logic Phase C, xem
 *     `.kiro/notes/canvas-backlog.md` mục 1)
 *   - Corner resize handle SVG bottom-right (SE only, Milanote parity).
 *
 * RULE CỨNG: 1 item = card + viền + chấm + icon resize, cùng 1 lớp. Viền nằm
 * trong stacking context của card (ObjectView có zIndex = geometry.zIndex), nên
 * card khác nằm trên che cả card lẫn viền. Không đặt viền ở tầng riêng với
 * zIndex cố định — bản cũ làm vậy nên viền card dưới nổi đè lên card trên.
 *
 * Khi drag: return null. Card thật đang hidden, preview floating đã có viền
 * qua Renderer isSelected=true. Multi-select resize: Phase C.
 */
export function SelectionBox({
  id,
  width,
  height,
}: {
  id: string;
  width: number;
  height: number;
}) {
  // Subscribe zoom ở đây (chỉ mount khi card được chọn) để card không chọn
  // không re-render theo zoom 60Hz.
  const zoom = useCameraStore((s) => s.camera.zoom);
  const dragging = useInteractionStore((s) => s.mode === 'dragging');
  const single = useSelectionStore((s) => s.selectedIds.size === 1);
  if (dragging) return null;

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
        // Toạ độ tương đối với khối card (cha), không phải world.
        left: -border,
        top: -border,
        width: width + border * 2,
        height: height + border * 2,
        border: `${border}px solid var(--primary)`,
        borderRadius: `${6 / zoom}px`, // match rounded-sm của ObjectShell
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
      // Handle nằm trong khối card: chặn double-click lọt lên ObjectView (vào edit).
      onDoubleClick={(e) => e.stopPropagation()}
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
