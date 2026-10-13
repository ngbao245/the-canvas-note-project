import type { PointerEvent as ReactPointerEvent } from 'react';
import { useObjectsStore } from '../store/objects-store';
import { useSelectionStore } from '../store/selection-store';
import { useCameraStore } from '../store/camera-store';
import { useInteractionStore, type ResizeHandle } from '../store/interaction-store';
import { commitResize, previewResize } from '../engine/actions';
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
 * Vùng viền:
 *   - Mặc định ObjectView bọc cả card.
 *   - Type có vùng thân nhỏ hơn khung (Board: khối vuông 72x72 trong tile
 *     98x139) đăng ký `ownSelectionFrame` trong registry, renderer tự đặt
 *     `<SelectionBox>` bên trong phần tử thân. Viền bọc đúng phần tử cha nhờ
 *     `inset`, không cần hard-code toạ độ.
 *
 * Khi drag: không cần ẩn riêng. Card nguồn bị `visibility:hidden` (useObjectDrag)
 * nên viền con ẩn theo. Preview floating render Renderer isSelected=true → type
 * tự vẽ viền dùng chính component này nên preview cũng chỉ bọc vùng thân.
 * Multi-select resize: Phase C.
 */
/** Bo góc card mặc định = rounded-sm của ObjectShell. */
const DEFAULT_RADIUS = 'calc(var(--radius) - 4px)';

export function SelectionBox({
  id,
  resizable = true,
  radius,
}: {
  id: string;
  /** false → không hiện icon resize (Board size cố định, Milanote parity). */
  resizable?: boolean;
  /** Bo góc của phần tử được bọc (giá trị CSS, VD 'var(--radius)'). Bỏ trống →
   *  bo góc card (rounded-sm ObjectShell = var(--radius) - 4px). */
  radius?: string;
}) {
  // Subscribe zoom ở đây (chỉ mount khi card được chọn) để card không chọn
  // không re-render theo zoom 60Hz.
  const zoom = useCameraStore((s) => s.camera.zoom);
  const single = useSelectionStore((s) => s.selectedIds.size === 1);

  // border 2/zoom → luôn 2px screen. Handle/dot size cũng bù zoom để giữ constant screen.
  const border = 2 / zoom;
  const cornerRadius = radius ?? DEFAULT_RADIUS;

  return (
    <div
      // data-canvas-overlay: canvas surface pointerdown listener (usePointerInteraction)
      // guard check attribute này để KHÔNG kích marquee mode khi user click vào
      // handle/dot bên trong. Native listener không tôn trọng React stopPropagation.
      data-canvas-overlay="true"
      className="pointer-events-none absolute inset-0"
      style={{
        // Hộp trùng đúng khung phần tử cha, viền vẽ bằng box-shadow loang ra ngoài.
        // Bản cũ đặt hộp lùi ra -border (số lẻ khi zoom ≠ 100%) + border: mép
        // trong viền và mép phần tử cha làm tròn khác nhau → hở 1 đường mảnh ở
        // vài cạnh, trông lệch. Box-shadow mọc từ chính mép hộp nên luôn khít,
        // bo góc ngoài tự = radius + border.
        boxShadow: `0 0 0 ${border}px var(--primary)`,
        borderRadius: cornerRadius,
      }}
    >
      {/* Chỉ hiện handle + dot khi 1 object select (Phase A single-resize). */}
      {single ? (
        <>
          <QuickLineDot zoom={zoom} border={border} radius={cornerRadius} />
          {resizable ? <CornerResizeHandle objectId={id} zoom={zoom} border={border} /> : null}
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
function QuickLineDot({
  zoom,
  border,
  radius,
}: {
  zoom: number;
  border: number;
  radius: string;
}) {
  const size = 12 / zoom;
  // Milanote khối vuông nên chấm đặt ở góc hộp là nằm trên viền. Bibo bo góc:
  // góc hộp là khoảng trống ngoài đường cong → chấm lơ lửng. Đặt tâm chấm lên
  // đường giữa viền, tại điểm 45° của cung bo góc:
  //   tâm cung cách mép hộp r; đường giữa viền có bán kính r + border/2;
  //   điểm 45° cách mép hộp: r - (r + border/2) * cos45.
  // Trừ nửa size để ra mép chấm. Tính bằng calc → đổi radius (kể cả 0 = vuông)
  // chấm tự theo, không hard-code theo type.
  const inset = `calc(${radius} - (${radius} + ${border / 2}px) * 0.70711 - ${size / 2}px)`;
  return (
    <div
      className="pointer-events-none absolute rounded-full bg-card"
      style={{
        top: inset,
        right: inset,
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
function CornerResizeHandle({
  objectId,
  zoom,
  border,
}: {
  objectId: string;
  zoom: number;
  border: number;
}) {
  const size = 16 / zoom;
  // Giữ vị trí cũ: 4px screen tính từ mép ngoài viền → trong hộp còn 4 - 2 = 2px.
  const offset = 4 / zoom - border;

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
      previewResize(objectId, { x: g0.x, y: g0.y, width: w, height: h });
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
