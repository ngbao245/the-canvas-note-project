import { memo, useCallback } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { CanvasObject } from '../types';
import { useObjectsStore } from '../store/objects-store';
import { useSelectionStore } from '../store/selection-store';
import { useInteractionStore } from '../store/interaction-store';
import { isLockedElsewhere, useRemoteLockStore } from '../store/remote-lock-store';
import { showNotice } from '../store/notice-store';
import { getObjectTypeDefinition } from '../hooks/useObjectRegistry';
import { useObjectDrag } from '../hooks/useObjectDrag';
import { SelectionBox } from './SelectionBox';
import { RemoteEditBadge } from './RemoteEditBadge';

/**
 * Render toàn bộ object trên canvas. Tra registry theo `obj.type` để lấy renderer.
 * Drag: dùng useObjectDrag (Milanote pattern — source mờ + floating preview + trash drop).
 * Double-click: vào edit mode, renderer tự lo UI edit.
 */
export function ObjectsLayer() {
  // Chỉ theo dõi danh sách id (so nông): gõ chữ / kéo đổi 1 object thì danh sách
  // không đổi → lớp này không render lại, chỉ ObjectView của object đó render.
  // Danh sách chỉ đổi khi thêm / xoá / đổi lớp / vào ra Unsort.
  const ids = useObjectsStore(useShallow((s) => canvasObjectIds(s.objects)));
  return (
    <>
      {ids.map((id) => (
        <ObjectView key={id} id={id} />
      ))}
    </>
  );
}

// memo: khi danh sách id đổi (thêm 1 note), các ObjectView khác giữ nguyên prop id → không render lại.
const ObjectView = memo(function ObjectView({ id }: { id: string }) {
  const obj = useObjectsStore((s) => s.objects.get(id));
  const selected = useSelectionStore((s) => s.selectedIds.has(id));
  const editing = useInteractionStore((s) => s.editingId === id);
  const def = obj ? getObjectTypeDefinition(obj.type) : undefined;
  const { onPointerDown } = useObjectDrag(id);

  const onDoubleClick = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      // Tab khác đang sửa: báo ngay, không mở editor (edit-locks cũng chặn, đây
      // chỉ để khỏi chớp editor rồi tắt).
      if (isLockedElsewhere(id)) {
        showNotice('CANVAS.NOTE_LOCK.BUSY');
        return;
      }
      useSelectionStore.getState().select(id);
      // Pass screen coord double-click → NoteEditor (và các renderer sau) đặt
      // caret tại vị trí click. Milanote parity: click hàng nào caret hàng đó.
      useInteractionStore.getState().setEditingId(id, { x: e.clientX, y: e.clientY });
    },
    [id],
  );

  const onEditEnd = useCallback(() => {
    if (useInteractionStore.getState().editingId === id) {
      useInteractionStore.getState().setEditingId(null);
    }
    // 2-tier dismiss (theo Milanote toolbar parity): thoát edit CHỈ clear
    // editingId, GIỮ selection → Toolbar về element mode (note vẫn active).
    // Muốn deselect note phải nhấn Dismiss lần 2 trong Toolbar element mode,
    // hoặc click vùng canvas trống (usePointerInteraction xử clear).
    // Áp cho mọi path exit: Escape / Ctrl+Enter / click outside / blur header /
    // Dismiss button trong Toolbar. Consistent behavior cho user không rối.
  }, [id]);

  const lockedElsewhere = useRemoteLockStore((s) => s.ids.has(id));
  // Object vừa bị xoá (danh sách id chưa kịp đổi) hoặc type lạ → bỏ qua, không crash.
  if (!obj || !def) return null;
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
      {/* Viền chọn nằm trong khối card → cùng lớp với card (xem SelectionBox).
          Type có ownSelectionFrame tự đặt viền quanh vùng thân bên trong Renderer. */}
      {selected && !def.ownSelectionFrame ? <SelectionBox id={id} /> : null}
      {lockedElsewhere ? <RemoteEditBadge id={id} /> : null}
    </div>
  );
});

/**
 * Id object trên canvas (bỏ object trong Unsort — UnsortPanel render riêng), theo
 * zIndex tăng dần: DOM order khớp stacking order, zIndex bằng nhau giữ thứ tự Map.
 */
function canvasObjectIds(objects: Map<string, CanvasObject>): string[] {
  return Array.from(objects.values())
    .filter((o) => o.unsortIndex === null)
    .sort((a, b) => a.geometry.zIndex - b.geometry.zIndex)
    .map((o) => o.id);
}
