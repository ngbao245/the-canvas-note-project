import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CanvasObject } from '../types';
import { useObjectsStore } from '../store/objects-store';
import { useSelectionStore } from '../store/selection-store';
import { useCurrentBoardStore } from '../store/current-board-store';
import { useUnsortStore } from '../store/unsort-store';
import { getCameraEngine } from '../engine/camera-engine';
import { clientToCanvas } from '../engine/coord';
import { hitZone, isInvalidZone } from '../lib/hit-test';
import { reorderInUnsort, moveFromUnsortToCanvas, moveObjectsToUnsort } from '../engine/actions';
import { boardDataSchema } from '../types';
import { getInterfaceScale } from '@/stores/interface-store';
import { isMacSecondaryClick } from '@/lib/shortcuts';
import { setCursorOverride } from '@/lib/cursor-override';

/**
 * Pointer drag cho Unsort items. Hai chế độ:
 *   1. Reorder trong panel: cursor giữ trong panel bounds → shift items khác,
 *      thả → reorderInUnsort(newOrder).
 *   2. Drag-out ra canvas: cursor rời panel → chuyển mode outside, hiện preview
 *      floating theo cursor. Thả trên canvas → moveFromUnsortToCanvas(x,y).
 *      Thả trên Board tile → moveObjectsToUnsort(target board).
 *      Thả ngoài canvas/panel → revert (không đổi gì).
 *
 * Threshold: 4px trước khi bắt đầu drag để không bị nhầm với click.
 */
const DRAG_THRESHOLD = 4;
// Số đo layout panel ở tỉ lệ 1 (px bên trong panel, chưa scale).
// Item aspect-ratio version: h cap MAX_H=140, margin-bottom 8 → stride 148.
const ITEM_HEIGHT = 148;
// Khoảng từ mép trên panel tới hàng đầu (header + description).
const LIST_OFFSET_TOP = 88;

export function useUnsortDrag(getListItems: () => CanvasObject[]) {
  const startRef = useRef<{
    clientX: number;
    clientY: number;
    sourceIndex: number;
    started: boolean;
    panelRect: DOMRect | null;
    grabOffsetX: number;
    grabOffsetY: number;
    sourceWidth: number;
    sourceHeight: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, object: CanvasObject, index: number) => {
      if (e.button !== 0) return;
      // macOS Ctrl+click = chuột phải, không bắt đầu kéo.
      if (isMacSecondaryClick(e)) return;

      const panelEl = (e.currentTarget as HTMLElement).closest('[data-unsort-panel="true"]');
      const panelRect = panelEl instanceof HTMLElement ? panelEl.getBoundingClientRect() : null;

      // Capture grab offset trong item bounding rect. Preview position sẽ dùng
      // offset này (scaled theo preview/source ratio) để giữ điểm nắm dưới cursor.
      const itemRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const grabOffsetX = e.clientX - itemRect.left;
      const grabOffsetY = e.clientY - itemRect.top;

      startRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        sourceIndex: index,
        started: false,
        panelRect,
        grabOffsetX,
        grabOffsetY,
        sourceWidth: itemRect.width,
        sourceHeight: itemRect.height,
      };

      const onMove = (ev: PointerEvent) => {
        const s = startRef.current;
        if (!s) return;
        const dx = ev.clientX - s.clientX;
        const dy = ev.clientY - s.clientY;
        if (!s.started && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        if (!s.started) {
          s.started = true;
          // Đảm bảo object đang drag nằm trong selection (drag single nếu chưa chọn).
          if (!useSelectionStore.getState().isSelected(object.id)) {
            useSelectionStore.getState().select(object.id);
          }
        }

        // Check outside panel.
        const outside = s.panelRect
          ? ev.clientX < s.panelRect.left ||
            ev.clientX > s.panelRect.right ||
            ev.clientY < s.panelRect.top ||
            ev.clientY > s.panelRect.bottom
          : false;

        // Cursor block khi cursor rời panel + rơi vào vùng invalid (overlay/outside).
        // Chung isInvalidZone với canvas + toolbar drag. Trong panel = reorder OK,
        // không block. Canvas/trash/unsort = valid drop khác nhau.
        const invalid = outside && isInvalidZone(hitZone(ev.clientX, ev.clientY));
        setCursorOverride(invalid ? 'not-allowed' : null);

        // Compute targetIndex trong panel (dựa vào cursor Y relative to panel content).
        let targetIndex = s.sourceIndex;
        if (!outside && s.panelRect) {
          // Panel bị scale theo Kích thước giao diện → số đo layout (px panel) × tỉ lệ = px màn hình.
          const scale = getInterfaceScale();
          const listTop = s.panelRect.top + LIST_OFFSET_TOP * scale;
          const offsetY = ev.clientY - listTop;
          targetIndex = Math.max(
            0,
            Math.min(getListItems().length - 1, Math.round(offsetY / (ITEM_HEIGHT * scale))),
          );
        }

        useUnsortStore.getState().setDrag({
          sourceIndex: s.sourceIndex,
          targetIndex,
          outsidePanel: outside,
          clientX: ev.clientX,
          clientY: ev.clientY,
          grabOffsetX: s.grabOffsetX,
          grabOffsetY: s.grabOffsetY,
          sourceWidth: s.sourceWidth,
          sourceHeight: s.sourceHeight,
        });
      };

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        setCursorOverride(null);

        const s = startRef.current;
        if (!s || !s.started) {
          startRef.current = null;
          useUnsortStore.getState().setDrag(null);
          return;
        }

        const drag = useUnsortStore.getState().drag;
        startRef.current = null;
        useUnsortStore.getState().setDrag(null);

        if (!drag) return;

        // Drag out của panel → drop trên canvas / Board tile / ngoài.
        if (drag.outsidePanel) {
          const zone = hitZone(ev.clientX, ev.clientY);
          if (zone !== 'canvas') return; // Drop ngoài canvas + panel → revert.

          // Chọn objects đang được move: nếu chỉ 1 item được drag (không có
          // selection group), dùng object đó. Nếu có selection multi trong
          // Unsort, dùng nguyên nhóm.
          const selection = Array.from(useSelectionStore.getState().selectedIds);
          const items = getListItems();
          const draggedIds =
            selection.length > 0
              ? items.filter((o) => selection.includes(o.id)).map((o) => o.id)
              : ([items[s.sourceIndex]?.id].filter(Boolean) as string[]);
          if (draggedIds.length === 0) return;

          // Check drop lên Board tile khác (nested cross-board move).
          const target = document.elementFromPoint(ev.clientX, ev.clientY);
          if (target instanceof Element) {
            const tileEl = target.closest('[data-board-tile-id]');
            if (tileEl instanceof HTMLElement) {
              const tileObjectId = tileEl.getAttribute('data-board-tile-id');
              const tileObj = tileObjectId
                ? useObjectsStore.getState().objects.get(tileObjectId)
                : null;
              const parsed = tileObj ? boardDataSchema.safeParse(tileObj.data) : null;
              if (parsed?.success) {
                moveObjectsToUnsort(draggedIds, parsed.data.linkedBoardId);
                return;
              }
            }
          }

          // Drop trên canvas trống → move ra canvas tại drop point.
          const cam = getCameraEngine().getCamera();
          const drop = clientToCanvas(ev.clientX, ev.clientY, cam);
          if (!drop) return; // surface chưa mount — không thể tính toạ độ, huỷ.
          moveFromUnsortToCanvas(draggedIds, drop.x, drop.y);
          return;
        }

        // Reorder trong panel.
        const items = getListItems();
        if (drag.sourceIndex === drag.targetIndex) return;

        // Build order mới: rút item ở sourceIndex ra, chèn vào targetIndex.
        const ordered = items.map((o) => o.id);
        const [moved] = ordered.splice(drag.sourceIndex, 1);
        ordered.splice(drag.targetIndex, 0, moved);

        const currentBoardId = useCurrentBoardStore.getState().currentBoardId;
        if (currentBoardId) reorderInUnsort(ordered, currentBoardId);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [getListItems],
  );

  return { onPointerDown };
}
