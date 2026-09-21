import { useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Inbox, X } from 'lucide-react';
import { useObjectsStore } from '../store/objects-store';
import { useUnsortStore } from '../store/unsort-store';
import { useInteractionStore } from '../store/interaction-store';
import type { CanvasObject } from '../types';
import { UnsortItem } from './UnsortItem';
import { useUnsortDrag } from '../hooks/useUnsortDrag';
import { getObjectTypeDefinition } from '../hooks/useObjectRegistry';
import { useCameraStore } from '../store/camera-store';

function useHoveredUnsortDropTarget(): boolean {
  return useInteractionStore((s) => s.hoveredUnsortDropTarget);
}

/**
 * Floating preview follow cursor khi user drag Unsort item ra ngoài panel.
 * Không có preview → user không biết đang drag cái gì. Portal ra body để
 * không bị clip bởi panel overflow-hidden.
 */
/**
 * Line indicator hiện giữa items trong panel khi drag tại slot mới. Chỉ show
 * khi drag đang trong panel (not outside) và target khác source. Nếu target
 * === source → user vẫn cầm ở chỗ cũ, không có insert intent → ẩn line.
 */
function DropIndicatorLine() {
  const drag = useUnsortStore((s) => s.drag);
  if (!drag || drag.outsidePanel || drag.targetIndex === drag.sourceIndex) return null;
  // Với UnsortItem aspect ratio version, height cap MAX_H=140 → mọi item ~140 tall.
  // Stride = 140 height + 8 margin-bottom = 148. Panel list p-3 = 12px padding top.
  const ITEM_STRIDE = 148;
  const LIST_PADDING_TOP = 12;
  const top = LIST_PADDING_TOP + drag.targetIndex * ITEM_STRIDE - 4;
  return (
    <div
      className="pointer-events-none absolute left-3 right-3 h-0.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
      style={{ top }}
    />
  );
}

/**
 * Preview follow cursor khi drag Unsort item. Milanote parity:
 *   - Size = geometry × camera zoom → khớp "kích thước thật" object trên canvas
 *     ở zoom hiện tại. Zoom 100% → full size, 40% → co lại.
 *   - Render actual renderer từ registry (Note card đầy đủ, Board tile solid).
 *   - Cursor giữ đúng điểm user nắm trong item: scale grab offset theo
 *     preview/source ratio để không bị lệch khỏi vị trí grab.
 */
function UnsortDragPreview({ items }: { items: CanvasObject[] }) {
  const drag = useUnsortStore((s) => s.drag);
  const zoom = useCameraStore((s) => s.camera.zoom);
  if (!drag) return null;
  const item = items[drag.sourceIndex];
  if (!item) return null;
  const def = getObjectTypeDefinition(item.type);
  if (!def) return null;
  const Renderer = def.renderer;

  const previewW = item.geometry.width * zoom;
  const previewH = item.geometry.height * zoom;
  const scaleX = previewW / drag.sourceWidth;
  const scaleY = previewH / drag.sourceHeight;
  const grabInPreviewX = drag.grabOffsetX * scaleX;
  const grabInPreviewY = drag.grabOffsetY * scaleY;

  return createPortal(
    <div
      className="pointer-events-none fixed"
      style={{
        left: drag.clientX - grabInPreviewX,
        top: drag.clientY - grabInPreviewY,
        width: previewW,
        height: previewH,
        opacity: 0.9,
        transition: 'none',
        // Tầng drag-layer (screen-space) — preview phải nổi trên toolbar/header
        // và mọi overlay. Khớp ghost trong useToolbarDrag. Xem `.kiro/notes/z-index-tiers.md`.
        zIndex: 'var(--z-drag-layer)',
        filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.35))',
      }}
    >
      <Renderer object={item} isSelected={false} isEditing={false} onEditEnd={noop} />
    </div>,
    document.body,
  );
}

function noop() {}

/**
 * Panel Unsort bên phải canvas. Đẩy layout (grid): mở → chiếm 260px, đóng → 0px.
 * List items có `unsortIndex !== null` và match currentBoardId.
 * Drag reorder qua useUnsortDrag; drag-out ra canvas cũng qua đó (khi cursor
 * rời khỏi panel bounds).
 */
export function UnsortPanel({ boardId }: { boardId: string | null }) {
  const setOpen = useUnsortStore((s) => s.setOpen);
  const objectsMap = useObjectsStore((s) => s.objects);
  const hoveredDropTarget = useHoveredUnsortDropTarget();

  const items = useMemo(() => {
    const list: CanvasObject[] = [];
    for (const o of objectsMap.values()) {
      if (o.unsortIndex !== null && o.boardId === boardId) list.push(o);
    }
    list.sort((a, b) => (a.unsortIndex ?? 0) - (b.unsortIndex ?? 0));
    return list;
  }, [objectsMap, boardId]);

  const getListItems = useCallback(() => items, [items]);
  const { onPointerDown } = useUnsortDrag(getListItems);

  return (
    <aside
      data-unsort-panel="true"
      data-unsort-drop-target="true"
      className={`flex h-full flex-col overflow-hidden border-l bg-card transition-colors ${
        hoveredDropTarget ? 'border-primary ring-2 ring-primary ring-inset' : 'border-border'
      }`}
    >
      {/* Header */}
      <div className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-border px-3">
        <Inbox className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Unsort</span>
        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">
          {items.length}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Đóng Unsort"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Floating preview khi drag item ra ngoài panel */}
      <UnsortDragPreview items={items} />

      {/* Description khi rỗng */}
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <Inbox className="h-5 w-5" />
          </div>
          <div className="text-xs text-muted-foreground">
            Chưa có object nào chờ xếp. Kéo object thả lên Board tile để đưa vào Unsort của board đích.
          </div>
        </div>
      ) : (
        <div className="no-scrollbar relative flex-1 overflow-y-auto p-3">
          {items.map((obj, index) => (
            <UnsortItem key={obj.id} object={obj} index={index} onPointerDown={onPointerDown} />
          ))}
          <DropIndicatorLine />
          <div className="mt-2 rounded-lg border border-dashed border-border p-3 text-center text-[10.5px] text-muted-foreground">
            Kéo 1 item ra canvas để đặt lên.
          </div>
        </div>
      )}
    </aside>
  );
}

/**
 * Toggle tab dính góc phải-trên canvas. Mount trong CanvasSurface (screen-space
 * overlay). Ẩn khi panel đang mở.
 */
export function UnsortToggle({ boardId }: { boardId: string | null }) {
  const open = useUnsortStore((s) => s.panelOpen);
  const toggle = useUnsortStore((s) => s.toggle);
  const objectsMap = useObjectsStore((s) => s.objects);
  const hoveredDropTarget = useHoveredUnsortDropTarget();

  const count = useMemo(() => {
    let n = 0;
    for (const o of objectsMap.values()) {
      if (o.unsortIndex !== null && o.boardId === boardId) n++;
    }
    return n;
  }, [objectsMap, boardId]);

  if (open) return null;

  return (
    <button
      type="button"
      data-canvas-overlay="true"
      data-unsort-drop-target="true"
      onClick={toggle}
      className={`absolute right-0 top-0 z-toolbar flex items-center gap-2 rounded-bl-lg border-b border-l bg-card/90 px-3 py-2 text-xs backdrop-blur transition-colors duration-[60ms] ${
        hoveredDropTarget
          ? 'border-primary text-primary ring-2 ring-primary'
          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-warning" />
      <Inbox className="h-3.5 w-3.5" />
      <span>
        Unsort · <span className="font-semibold text-foreground">{count}</span>
      </span>
    </button>
  );
}
