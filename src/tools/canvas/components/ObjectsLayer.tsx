import { useCallback } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CanvasObject } from '../types';
import { useObjectsStore } from '../store/objects-store';
import { useSelectionStore } from '../store/selection-store';
import { useInteractionStore } from '../store/interaction-store';
import { getObjectTypeDefinition } from '../hooks/useObjectRegistry';
import { useObjectDrag } from '../hooks/useObjectDrag';

/**
 * Render toàn bộ object trên canvas. Tra registry theo `obj.type` để lấy renderer.
 * Drag: dùng useObjectDrag (Milanote pattern — source mờ + floating preview + trash drop).
 * Double-click: vào edit mode, renderer tự lo UI edit.
 */
export function ObjectsLayer() {
  const objectsMap = useObjectsStore((s) => s.objects);
  // Chỉ render object trên canvas — object trong Unsort (unsortIndex !== null)
  // được UnsortPanel render riêng. Sort theo zIndex ascending: DOM order khớp
  // stacking order → paint order ổn định (khi zIndex bằng nhau, sau ổn định
  // theo thứ tự Map insertion, không nhảy).
  const objects = Array.from(objectsMap.values())
    .filter((o) => o.unsortIndex === null)
    .sort((a, b) => a.geometry.zIndex - b.geometry.zIndex);
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
  const editing = useInteractionStore((s) => s.editingId === obj.id);
  const def = getObjectTypeDefinition(obj.type);
  const { onPointerDown } = useObjectDrag(obj.id);

  const onDoubleClick = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      useSelectionStore.getState().select(obj.id);
      // Pass screen coord double-click → NoteEditor (và các renderer sau) đặt
      // caret tại vị trí click. Milanote parity: click hàng nào caret hàng đó.
      useInteractionStore
        .getState()
        .setEditingId(obj.id, { x: e.clientX, y: e.clientY });
    },
    [obj.id],
  );

  const onEditEnd = useCallback(() => {
    if (useInteractionStore.getState().editingId === obj.id) {
      useInteractionStore.getState().setEditingId(null);
    }
    // 2-tier dismiss (theo Milanote toolbar parity): thoát edit CHỈ clear
    // editingId, GIỮ selection → Toolbar về element mode (note vẫn active).
    // Muốn deselect note phải nhấn Dismiss lần 2 trong Toolbar element mode,
    // hoặc click vùng canvas trống (usePointerInteraction xử clear).
    // Áp cho mọi path exit: Escape / Ctrl+Enter / click outside / blur header /
    // Dismiss button trong Toolbar. Consistent behavior cho user không rối.
  }, [obj.id]);

  if (!def) return null; // type lạ (data cũ chưa migrate) → bỏ qua, không crash.
  const Renderer = def.renderer;

  return (
    <div
      data-object-id={obj.id}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      className={editing ? 'absolute' : 'absolute cursor-move'}
      style={{
        left: obj.geometry.x,
        top: obj.geometry.y,
        width: obj.geometry.width,
        height: obj.geometry.height,
        zIndex: obj.geometry.zIndex,
      }}
    >
      <Renderer object={obj} isSelected={selected} isEditing={editing} onEditEnd={onEditEnd} />
    </div>
  );
}
