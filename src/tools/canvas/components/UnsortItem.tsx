import type { PointerEvent as ReactPointerEvent } from 'react';
import { FileText, Layout, Square } from 'lucide-react';
import type { CanvasObject } from '../types';
import { noteDataSchema, boardDataSchema } from '../types';
import { useSelectionStore } from '../store/selection-store';
import { useBoardsStore } from '../store/boards-store';
import { useUnsortStore } from '../store/unsort-store';
import { isMacSecondaryClick, isPrimaryModifier } from '@/lib/shortcuts';

/**
 * 1 item trong Unsort list. Milanote parity: render với aspect ratio khớp
 * `object.geometry.width / height` để user thấy đúng shape object thật. Cap
 * max/min để list không quá lệch.
 *
 * Layout content adapt:
 *   - Landscape (w > h): icon-box trái + text phải (horizontal).
 *   - Portrait/square (h >= w): icon-box top + text bottom (vertical).
 *
 * Click chọn (share useSelectionStore với canvas). Ctrl/Shift click cho multi.
 * Pointer down → useUnsortDrag bắt reorder / drag-out.
 */
export function UnsortItem({
  object,
  index,
  items,
  onPointerDown,
}: {
  object: CanvasObject;
  index: number;
  /** Toàn bộ item list Unsort ở board hiện tại. Dùng cho Shift+click range. */
  items: CanvasObject[];
  onPointerDown: (
    e: ReactPointerEvent<HTMLDivElement>,
    object: CanvasObject,
    index: number,
  ) => void;
}) {
  const selected = useSelectionStore((s) => s.selectedIds.has(object.id));
  const drag = useUnsortStore((s) => s.drag);

  const isDragged = drag && drag.sourceIndex === index;
  // Khi cầm item ra ngoài panel → item unmount hoàn toàn.
  // Vẫn trong panel → chỉ mờ nhẹ 0.5 (Milanote: chỗ cũ mờ).
  const hidden = isDragged && drag.outsidePanel;
  if (hidden) return null;

  // Width cố định 232 (fill panel), height cap max 140 / min 60. Giữ aspect
  // ratio object thật thông qua h khi có thể; khi w/ar vượt MAX_H, cap h nhưng
  // KHÔNG shrink w → list items thẳng hàng, dễ đọc.
  const ar = object.geometry.width / object.geometry.height;
  const W = 232;
  const MAX_H = 140;
  const MIN_H = 60;
  let h = W / ar;
  if (h > MAX_H) h = MAX_H;
  if (h < MIN_H) h = MIN_H;
  // Layout content luôn horizontal (item luôn landscape với w=232).
  const vertical = false;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // macOS Ctrl+click = chuột phải: giữ nguyên vùng chọn.
    if (isMacSecondaryClick(e)) return;
    const sel = useSelectionStore.getState();
    const unsort = useUnsortStore.getState();

    if (e.shiftKey && unsort.lastSelectedIndex !== null) {
      // Shift+click: chọn range từ anchor tới index này (inclusive). Anchor
      // giữ nguyên để user có thể mở rộng tiếp tục qua các Shift+click sau.
      const a = Math.min(unsort.lastSelectedIndex, index);
      const b = Math.max(unsort.lastSelectedIndex, index);
      const rangeIds: string[] = [];
      for (let i = a; i <= b; i++) {
        const it = items[i];
        if (it) rangeIds.push(it.id);
      }
      sel.replace(rangeIds);
      return;
    }

    if (isPrimaryModifier(e)) {
      sel.toggle(object.id);
      unsort.setLastSelectedIndex(index);
      return;
    }

    // Click thường.
    sel.select(object.id);
    unsort.setLastSelectedIndex(index);
  };

  return (
    <div
      data-unsort-item-id={object.id}
      data-unsort-index={index}
      onPointerDown={(e) => onPointerDown(e, object, index)}
      onClick={handleClick}
      style={{
        width: W,
        height: h,
        margin: '0 auto 8px',
        opacity: isDragged ? 0.5 : 1,
      }}
      className={`cursor-grab rounded-lg border p-2.5 flex ${
        vertical ? 'flex-col items-center gap-1.5' : 'items-start gap-2.5'
      } ${
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border bg-background hover:border-border/70'
      }`}
    >
      <IconBox type={object.type} />
      <div className={`min-w-0 flex-1 ${vertical ? 'text-center w-full' : ''}`}>
        <div
          className={`truncate text-[12px] font-semibold text-foreground ${
            vertical ? 'w-full' : ''
          }`}
        >
          {getName(object)}
        </div>
        <div className="mt-0.5 text-[10.5px] text-muted-foreground">{getSubtitle(object)}</div>
      </div>
    </div>
  );
}

function IconBox({ type }: { type: string }) {
  if (type === 'note') {
    return (
      <div className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <FileText className="h-3.5 w-3.5" />
      </div>
    );
  }
  if (type === 'board') {
    return (
      <div className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-md bg-warning/10 text-warning">
        <Layout className="h-3.5 w-3.5" />
      </div>
    );
  }
  return (
    <div className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
      <Square className="h-3.5 w-3.5" />
    </div>
  );
}

function getName(object: CanvasObject): string {
  if (object.type === 'note') {
    const parsed = noteDataSchema.safeParse(object.data);
    if (parsed.success) {
      // Body là HTML (Tiptap). Lấy text của block đầu (h1 nếu có, else p đầu).
      // Parse bằng DOMParser (document tách rời): không tải ảnh, không chạy
      // handler. KHÔNG dùng div.innerHTML trên document chính — `<img onerror>`
      // vẫn chạy dù div chưa gắn vào trang.
      const doc = new DOMParser().parseFromString(parsed.data.body, 'text/html');
      const first = doc.body.querySelector('h1, h2, h3, p');
      const text = first?.textContent?.trim() ?? '';
      return text || 'Untitled note';
    }
    return 'Untitled note';
  }
  if (object.type === 'board') {
    const parsed = boardDataSchema.safeParse(object.data);
    if (parsed.success) {
      const board = useBoardsStore.getState().boards.get(parsed.data.linkedBoardId);
      return board?.name || 'New Board';
    }
    return 'Board';
  }
  return object.type.charAt(0).toUpperCase() + object.type.slice(1);
}

function getSubtitle(object: CanvasObject): string {
  if (object.type === 'note') return 'Note';
  if (object.type === 'board') return 'Board';
  return object.type;
}
