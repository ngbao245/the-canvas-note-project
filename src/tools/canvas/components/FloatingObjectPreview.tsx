import { createPortal } from 'react-dom';
import type { CanvasObject } from '../types';
import { getObjectTypeDefinition } from '../hooks/useObjectRegistry';
import { useCameraStore } from '../store/camera-store';
import { prefersReducedMotion } from '@/lib/motion';

/**
 * FloatingObjectPreview — visualizer chung cho kéo object canvas, item Unsort,
 * nút thanh tạo. Kéo nhiều object canvas: mỗi object 1 bản (CanvasObjectDragPreview).
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
 */
export function FloatingObjectPreview({
  object,
  clientX,
  clientY,
  grabOffsetX,
  grabOffsetY,
  dim,
  selected = false,
  compactScale,
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
  /** Toolbar drag: số = scale thay cho zoom (caller tính, giữ đúng hình dáng),
   *  null = cỡ thật theo zoom.
   *  Truyền prop (kể cả null) thì đổi qua lại có chuyển động bung / co. Bỏ prop
   *  = cỡ thật, không chuyển động (kéo canvas, Unsort). */
  compactScale?: number | null;
}) {
  const zoom = useCameraStore((s) => s.camera.zoom);
  const def = getObjectTypeDefinition(object.type);
  if (!def) return null;
  const Renderer = def.renderer;
  const scale = compactScale ?? zoom;
  // Gốc scale đặt tại điểm con trỏ cầm (đổi grabOffset màn hình về canvas-space)
  // → con trỏ đứng yên khi preview bung / co. Ở cỡ thật kết quả y như gốc 0 0.
  const originX = grabOffsetX / zoom;
  const originY = grabOffsetY / zoom;
  const animated = compactScale !== undefined && !prefersReducedMotion();

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
        left: clientX - originX,
        top: clientY - originY,
        width: object.geometry.width,
        height: object.geometry.height,
        transform: `scale(${scale})`,
        transformOrigin: `${originX}px ${originY}px`,
        transition: animated
          ? 'transform var(--duration-normal) var(--easing-enter)'
          : undefined,
        opacity: dim ? 0.5 : 1,
        // Shadow ở đây bị scale theo zoom cùng subtree — zoom out → shadow nhỏ,
        // khớp với item thật trong world (cũng bị scale). Không muốn shadow
        // giữ constant screen thì phải overlay layer riêng, không cần thiết.
        // Type tự vẽ viền vùng thân (Board) có khung lớn hơn phần nhìn thấy, phần
        // dư trong suốt → shadow cả khung hiện thành 1 hình chữ nhật thừa. Bỏ.
        boxShadow: def.ownSelectionFrame ? undefined : '0 12px 32px rgba(0, 0, 0, 0.35)',
        // Tầng drag-layer (screen-space) — preview nổi trên toolbar/header/panel.
        // Xem `docs/system/02-ui-common.md` mục "Lớp z".
        zIndex: 'var(--z-drag-layer)',
      }}
    >
      <Renderer object={object} isSelected={selected} isEditing={false} onEditEnd={noop} />
    </div>,
    document.body,
  );
}

function noop() {}
