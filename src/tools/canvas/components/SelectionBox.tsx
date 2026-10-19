import type { PointerEvent as ReactPointerEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useObjectsStore } from '../store/objects-store';
import { useSelectionStore } from '../store/selection-store';
import { useCameraStore } from '../store/camera-store';
import { shownHeight, useInteractionStore, type ResizeHandle } from '../store/interaction-store';
import { commitResize, previewResize } from '../engine/actions';
import { getObjectMinSize, getObjectTypeDefinition } from '../hooks/useObjectRegistry';

/**
 * SelectionBox — viền chọn Milanote-style, render BÊN TRONG khối card
 * (ObjectView), không phải tầng riêng. Gồm:
 *   - Outline quanh card (`--canvas-selection`, mặc định đen / trắng theo theme,
 *     đổi trong Cài đặt → Canvas; bù zoom → luôn 2px màn hình)
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

/** Cỡ gốc (canvas-px ở zoom 1) + khoảng kẹp trên màn của chấm và góc resize. */
const DOT_SIZE = { base: 12, min: 8, max: 16 };
const HANDLE_SIZE = { base: 20, min: 14, max: 26 };

/**
 * Cỡ theo canvas (to nhỏ theo zoom như Milanote) nhưng kẹp trên màn trong
 * [min, max]: zoom nhỏ không teo tới mức không bấm được, zoom to không phình.
 * Trả canvas-px vì phần tử nằm trong lớp đã scale theo zoom.
 */
function zoomedSize({ base, min, max }: typeof DOT_SIZE, zoom: number): number {
  const screen = Math.min(max, Math.max(min, base * zoom));
  return screen / zoom;
}

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
        boxShadow: `0 0 0 ${border}px var(--canvas-selection)`,
        borderRadius: cornerRadius,
      }}
    >
      {/* Chỉ hiện handle + dot khi 1 object select (Phase A single-resize). */}
      {single ? (
        <>
          <QuickLineDot zoom={zoom} border={border} radius={cornerRadius} />
          {resizable ? <CornerResizeHandle objectId={id} zoom={zoom} /> : null}
        </>
      ) : null}
    </div>
  );
}

/**
 * QuickLineDot — chấm nhỏ top-right, hint kéo tạo line/arrow (Milanote pattern).
 * Phase B: visual only. Drag logic + LineObject → Phase C (xem backlog).
 * Chấm đặc màu viền chọn, cỡ theo `DOT_SIZE`, bóng nhẹ. Hover to 1.75 + hiện mũi tên + crosshair.
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
  const size = zoomedSize(DOT_SIZE, zoom);
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
      // Chấm đặc, không viền: tô màu viền chọn (đổi trong Cài đặt → Canvas).
      // Hover: chấm to lên thành nút tròn có mũi tên chéo lên phải (gợi ý kéo ra
      // mũi tên nối, backlog Line). Con trỏ giữ con trỏ thường. Bấm không lọt
      // xuống card (không chọn / kéo / vào sửa).
      className="group pointer-events-auto absolute flex items-center justify-center rounded-full transition-transform duration-fast ease-standard hover:scale-[1.75]"
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      style={{
        top: inset,
        right: inset,
        width: size,
        height: size,
        background: 'var(--canvas-selection)',
        boxShadow: 'var(--shadow-elevation-1)',
      }}
      aria-hidden="true"
    >
      {/* Icon vẽ trong khung chấm rồi scale cùng chấm; ẩn tới khi hover. */}
      <ArrowUpRight
        className="opacity-0 transition-opacity duration-fast ease-standard group-hover:opacity-100"
        style={{
          width: size * 0.75,
          height: size * 0.75,
          color: 'var(--canvas-selection-foreground)',
        }}
        strokeWidth={3}
      />
    </div>
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
  const size = zoomedSize(HANDLE_SIZE, zoom);
  // Khoảng cách tới góc đổi cùng tỉ lệ với cỡ (2 / 16 ở cỡ gốc).
  const offset = size / 8;

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
    const { width: minW, height: minH } = getObjectMinSize(start.type);
    // Note đang sửa có thể đang dài hơn cao đã lưu (chiều cao tạm): kéo từ đúng
    // khung đang thấy, không nhảy về cao cũ. Undo vẫn trả về g0 (cao đã lưu).
    const baseH = shownHeight(useInteractionStore.getState(), objectId, g0.height);

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startClientX) / zoom;
      const dy = (ev.clientY - startClientY) / zoom;
      const w = Math.max(minW, g0.width + dx);
      const h = Math.max(minH, baseH + dy);
      previewResize(objectId, { x: g0.x, y: g0.y, width: w, height: h });
    };
    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      useInteractionStore.getState().setMode('idle');
      useInteractionStore.getState().setResizeHandle(null);
      const end = useObjectsStore.getState().objects.get(objectId);
      if (end) {
        // Type-specific side-effect (VD Note lock heightMode='fixed') gộp vào
        // cùng bước undo với resize. Chỉ gọi nếu geometry thực sự đổi.
        const changed =
          g0.width !== end.geometry.width || g0.height !== end.geometry.height;
        const extra = changed ? def?.onResizeCommit?.(objectId, g0, end.geometry) : undefined;
        commitResize(objectId, g0, end.geometry, extra);
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
