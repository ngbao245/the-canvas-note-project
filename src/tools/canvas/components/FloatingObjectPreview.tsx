import { createPortal } from 'react-dom';
import type { CanvasObject } from '../types';
import { getObjectTypeDefinition } from '../hooks/useObjectRegistry';
import { useCameraStore } from '../store/camera-store';

/**
 * FloatingObjectPreview — visualizer chung cho Toolbar drag + Unsort drag.
 *
 * Portal ra document.body (position fixed) → thoát mọi stacking + overflow clip
 * của parent → tự nhiên nổi trên toolbar/header/panel overlay.
 *
 * Size = geometry × camera.zoom (screen-space). Nhìn identical với item khi
 * drop trên canvas: cùng registry Renderer, cùng ObjectShell wrap bên trong,
 * cùng shadow lift với canvas drag item.
 *
 * Caller trách nhiệm tính:
 *   - clientX/Y: cursor position hiện tại.
 *   - grabOffsetX/Y: cursor tới top-left preview trong PREVIEW-space (đã scale
 *     theo previewW/sourceW nếu source size khác preview size — VD Unsort item
 *     232px source vs 338px canvas preview).
 *   - dim: cursor đang ở vùng khác canvas trống (isSecondaryZone) → opacity 0.5.
 *
 * KHÔNG dùng cho canvas drag — canvas dùng in-place pattern (item DOM cầm và
 * bay trong wrapper camera-transformed). Xem `useObjectDrag.ts`.
 */
export function FloatingObjectPreview({
  object,
  clientX,
  clientY,
  grabOffsetX,
  grabOffsetY,
  dim,
  selected = false,
}: {
  /** Object thật (Unsort drag / Canvas drag) hoặc mock (Toolbar drag chưa tạo). */
  object: CanvasObject;
  clientX: number;
  clientY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  dim: boolean;
  /** Item đang selected → truyền qua Renderer để ObjectShell vẽ viền ring
   *  primary. RULE CỨNG (xem handoff): card selected LUÔN có viền, kể cả khi
   *  drag preview — không được để preview "trần" trong khi item thật có viền.
   *  Canvas drag + Unsort drag pass true. Toolbar drag (chưa tạo item) pass false. */
  selected?: boolean;
}) {
  const zoom = useCameraStore((s) => s.camera.zoom);
  const def = getObjectTypeDefinition(object.type);
  if (!def) return null;
  const Renderer = def.renderer;

  // Dùng transform: scale(zoom) thay vì set width/height × zoom. Lý do:
  // set explicit size scale container NHƯNG font (text-base=16px, text-sm=14px
  // Tailwind screen-space) KHÔNG scale → zoom out → container nhỏ, chữ giữ
  // nguyên → tràn, ratio sai. Item thật trên canvas nằm trong world wrapper
  // có transform:scale(zoom) nên font/padding/shadow SCALE ĐỒNG BỘ. Preview
  // dùng cùng cơ chế transform → visual identical với item thật ở mọi zoom.
  //
  // width/height giữ ở canvas-space (geometry gốc); transform-origin 0 0
  // để scale từ top-left. Cursor position vẫn match qua grabOffset (đã ×zoom
  // screen-space bởi caller).
  return createPortal(
    <div
      className="pointer-events-none fixed"
      style={{
        left: clientX - grabOffsetX,
        top: clientY - grabOffsetY,
        width: object.geometry.width,
        height: object.geometry.height,
        transform: `scale(${zoom})`,
        transformOrigin: '0 0',
        opacity: dim ? 0.5 : 1,
        // Shadow ở đây bị scale theo zoom cùng subtree — zoom out → shadow nhỏ,
        // khớp với item thật trong world (cũng bị scale). Không muốn shadow
        // giữ constant screen thì phải overlay layer riêng, không cần thiết.
        // Type tự vẽ viền vùng thân (Board) có khung lớn hơn phần nhìn thấy, phần
        // dư trong suốt → shadow cả khung hiện thành 1 hình chữ nhật thừa. Bỏ.
        boxShadow: def.ownSelectionFrame ? undefined : '0 12px 32px rgba(0, 0, 0, 0.35)',
        // Tầng drag-layer (screen-space) — preview nổi trên toolbar/header/panel.
        // Xem `.kiro/notes/z-index-tiers.md`.
        zIndex: 'var(--z-drag-layer)',
      }}
    >
      <Renderer object={object} isSelected={selected} isEditing={false} onEditEnd={noop} />
    </div>,
    document.body,
  );
}

function noop() {}
