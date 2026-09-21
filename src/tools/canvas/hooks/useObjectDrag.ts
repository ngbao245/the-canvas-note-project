import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useObjectsStore } from '../store/objects-store';
import { useSelectionStore } from '../store/selection-store';
import { useCameraStore } from '../store/camera-store';
import { useInteractionStore } from '../store/interaction-store';
import { getCameraEngine } from '../engine/camera-engine';
import { clientToCanvas } from '../engine/coord';
import {
  applyMoveDelta,
  bringToFront,
  commitMove,
  deleteObjects,
  moveObjectsToUnsort,
  moveToUnsortHere,
} from '../engine/actions';
import { hitZone } from '../lib/hit-test';
import { boardDataSchema } from '../types';
import { createEdgePanLoop } from './useEdgePan';

/**
 * Drag object trên canvas theo pattern Milanote — "cầm chính item lên":
 *   - pointerdown: ghi grab offset canvas-space (cursor tới top-left object).
 *   - pointermove vượt threshold → startDrag:
 *       + Nâng z-index world wrapper lên --z-drag-layer → cả layer vượt Unsort
 *         panel/tab ở cấp screen (wrapper có transform → stacking context riêng).
 *       + Source elements: shadow lift + zIndex cao trong world + pointer-events:none
 *         để hit-test nhìn xuyên xuống drop target.
 *   - pointermove: reposition tất cả selected qua applyMoveDelta (item gốc chạy
 *     trực tiếp theo cursor, size khớp zoom vì vẫn trong world layer).
 *   - pointerup:
 *       + trash → deleteObjects.
 *       + Board tile → revert geometry + moveObjectsToUnsort (cross-board).
 *       + Unsort target → revert geometry + moveToUnsortHere (same-board).
 *       + Vùng invalid → revert (không commit).
 *       + Canvas trống → commit MoveCommand từ before snapshot.
 *
 * Multi-select: tất cả selected cùng move, primary được bringToFront khi startDrag.
 */

const DRAG_THRESHOLD = 5;

interface DragStart {
  clientX: number;
  clientY: number;
  /** Offset canvas-space giữa cursor và primary object top-left tại pointerdown.
   *  Dùng absolute để cursor luôn giữ đúng grab point, không tích lũy sai số. */
  grabOffsetCanvasX: number;
  grabOffsetCanvasY: number;
  primaryId: string;
  ids: string[]; // tất cả object đang selected cùng move
}

export function useObjectDrag(objectId: string) {
  const startRef = useRef<DragStart | null>(null);
  const draggingRef = useRef(false);
  const sourceElsRef = useRef<HTMLElement[]>([]);
  const hoverTrashRef = useRef(false);
  const invalidZoneRef = useRef(false);
  const lastClientRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const edgePanRef = useRef<ReturnType<typeof createEdgePanLoop> | null>(null);

  const cleanup = useCallback(() => {
    edgePanRef.current?.stop();
    edgePanRef.current = null;
    // Hạ z-index world wrapper về mặc định (đã nâng khi startDrag để item vượt overlay).
    const wrapper = getCameraEngine().getWrapper();
    if (wrapper) wrapper.style.zIndex = '';
    // Restore lift effect trên tất cả object đang drag.
    for (const el of sourceElsRef.current) {
      el.style.transform = '';
      el.style.boxShadow = '';
      el.style.transition = '';
      el.style.zIndex = '';
      el.style.pointerEvents = '';
      el.style.opacity = '';
    }
    sourceElsRef.current = [];
    const trash = document.querySelector('[data-trash-drop]');
    if (trash instanceof HTMLElement) {
      trash.style.background = '';
      trash.style.color = '';
      trash.style.transform = '';
    }

    document.body.classList.remove('canvas-drag-invalid');
    invalidZoneRef.current = false;
    // Clear board tile hover state — BoardObject bỏ ring highlight.
    if (useInteractionStore.getState().hoveredBoardTileId !== null) {
      useInteractionStore.getState().setHoveredBoardTileId(null);
    }
    hoveredBoardTileRef.current = null;
    // Clear Unsort drop target hover.
    if (useInteractionStore.getState().hoveredUnsortDropTarget) {
      useInteractionStore.getState().setHoveredUnsortDropTarget(false);
    }
    hoveredUnsortTargetRef.current = false;

    startRef.current = null;
    draggingRef.current = false;
    hoverTrashRef.current = false;
    beforeRef.current = null;
  }, []);

  /**
   * Reposition tất cả selected object theo cursor hiện tại + camera hiện tại
   * (absolute logic — cursor luôn giữ đúng grab point). Dùng bởi cả onMove
   * (khi user di chuyển pointer) VÀ pan loop (khi cursor đứng yên nhưng camera
   * pan, item vẫn bám cursor).
   */
  const reposition = () => {
    const start = startRef.current;
    if (!start) return;
    const cursor = lastClientRef.current;
    const p = clientToCanvas(cursor.x, cursor.y, getCameraEngine().getCamera());
    if (!p) return;
    const targetPrimaryX = p.x - start.grabOffsetCanvasX;
    const targetPrimaryY = p.y - start.grabOffsetCanvasY;
    const primary = useObjectsStore.getState().objects.get(start.primaryId);
    if (!primary) return;
    const dx = targetPrimaryX - primary.geometry.x;
    const dy = targetPrimaryY - primary.geometry.y;
    if (dx === 0 && dy === 0) return;
    applyMoveDelta(start.ids, dx, dy);
  };

  const beforeRef = useRef<Map<string, { x: number; y: number }> | null>(null);
  /** BoardObject.id đang bị cursor hover khi drag object khác qua. Không phải
   *  linkedBoardId — cần object.id để BoardObject subscribe interaction-store. */
  const hoveredBoardTileRef = useRef<string | null>(null);
  /** Cursor đang hover trên UnsortToggle hoặc UnsortPanel (data-unsort-drop-target). */
  const hoveredUnsortTargetRef = useRef<boolean>(false);

  const startDrag = (start: DragStart) => {
    draggingRef.current = true;
    useInteractionStore.getState().setMode('dragging');

    // Milanote parity: item được cầm lên luôn nổi trên các item khác. Raise
    // geometry.zIndex của primary object (chỉ khi bắt đầu drag thật, không khi
    // chỉ click). Push undo riêng — độc lập với move.
    bringToFront(start.primaryId);

    // Snapshot vị trí ban đầu tất cả selected (dùng commit MoveCommand khi drop).
    const before = new Map<string, { x: number; y: number }>();
    for (const id of start.ids) {
      const o = useObjectsStore.getState().objects.get(id);
      if (o) before.set(id, { x: o.geometry.x, y: o.geometry.y });
    }
    beforeRef.current = before;

    // "Cầm chính item lên" (Milanote parity, không clone):
    //   - Nâng z-index world wrapper lên --z-drag-layer → cả world layer vượt
    //     Unsort panel overlay (z-toolbar) + mọi overlay khác. Wrapper có transform
    //     → tạo stacking context riêng, phải nâng ở CẤP wrapper mới vượt được.
    //   - Trên từng source element: shadow + z-index cao trong world để nổi trên
    //     object khác cùng board.
    // Item gốc chạy trực tiếp theo cursor qua reposition() → cảm giác cầm thẳng
    // item lên, size khớp zoom vì item vẫn ở trong world layer (scale theo camera).
    const wrapper = getCameraEngine().getWrapper();
    if (wrapper) wrapper.style.zIndex = 'var(--z-drag-layer)';

    const sourceEls: HTMLElement[] = [];
    for (const id of start.ids) {
      const el = document.querySelector(`[data-object-id="${id}"]`);
      if (el instanceof HTMLElement) {
        el.style.transition = 'box-shadow 80ms';
        el.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.35)';
        el.style.zIndex = 'var(--z-drag-layer)';
        // pointer-events: none để hit-test (elementFromPoint) nhìn xuyên source
        // xuống drop target (Unsort panel/tab, Board tile) — không thì source
        // che target ngay dưới cursor.
        el.style.pointerEvents = 'none';
        sourceEls.push(el);
      }
    }
    sourceElsRef.current = sourceEls;

    // Edge auto-pan: item bám cursor qua reposition() khi camera pan.
    const loop = createEdgePanLoop({
      isDragging: () => draggingRef.current,
      getCursor: () => lastClientRef.current,
      getDraggingIds: () => startRef.current?.ids ?? [],
      reposition,
    });
    edgePanRef.current = loop;
    loop.start();
  };

  /** Detect vùng cursor:
   *   - Trash: valid drop = delete
   *   - Canvas surface (over Board tile): valid drop = move cross-board
   *   - Canvas surface (không tile): valid drop = move trong canvas hiện tại
   *   - Overlay khác trash (toolbar body): invalid → revert
   *   - Ngoài toàn bộ (header/document): invalid → revert
   */
  const updateZone = (clientX: number, clientY: number) => {
    const zone = hitZone(clientX, clientY);
    // trash = drop xoá; canvas/unsort = drop valid; overlay/outside = invalid.
    const overTrash = zone === 'trash';
    const invalid = zone === 'overlay' || zone === 'outside';

    // Detect hover trên BoardObject: chỉ khi zone='canvas' và không phải chính
    // object đang drag (không thể move object vào chính nó nếu là board).
    let overBoardTile: string | null = null;
    if (zone === 'canvas' && !overTrash) {
      const target = document.elementFromPoint(clientX, clientY);
      if (target instanceof Element) {
        const tileEl = target.closest('[data-board-tile-id]');
        if (tileEl instanceof HTMLElement) {
          const tileObjectId = tileEl.getAttribute('data-board-tile-id');
          const dragging = startRef.current?.ids ?? [];
          if (tileObjectId && !dragging.includes(tileObjectId)) {
            overBoardTile = tileObjectId;
          }
        }
      }
    }
    if (overBoardTile !== hoveredBoardTileRef.current) {
      hoveredBoardTileRef.current = overBoardTile;
      useInteractionStore.getState().setHoveredBoardTileId(overBoardTile);
    }

    // Detect hover trên Unsort drop target (toggle tab hoặc panel). Chỉ khi
    // KHÔNG hover Board tile (tile ưu tiên hơn để tránh conflict khi tile
    // nằm trong panel — không xảy ra hiện tại nhưng safe).
    let overUnsortTarget = false;
    if (!overBoardTile && !overTrash) {
      const target = document.elementFromPoint(clientX, clientY);
      if (target instanceof Element) {
        overUnsortTarget = target.closest('[data-unsort-drop-target]') !== null;
      }
    }
    if (overUnsortTarget !== hoveredUnsortTargetRef.current) {
      hoveredUnsortTargetRef.current = overUnsortTarget;
      useInteractionStore.getState().setHoveredUnsortDropTarget(overUnsortTarget);
    }

    if (overTrash !== hoverTrashRef.current) {
      hoverTrashRef.current = overTrash;
      const trash = document.querySelector('[data-trash-drop]');
      if (trash instanceof HTMLElement) {
        if (overTrash) {
          trash.style.background = 'color-mix(in srgb, var(--destructive) 20%, transparent)';
          trash.style.color = 'var(--destructive)';
          trash.style.transform = 'scale(1.1)';
        } else {
          trash.style.background = '';
          trash.style.color = '';
          trash.style.transform = '';
        }
      }
    }

    if (invalid !== invalidZoneRef.current) {
      invalidZoneRef.current = invalid;
      // Toggle body class → CSS global override cursor cho MỌI element (kể cả
      // button có cursor-pointer riêng). Xem canvas-drag-invalid trong index.css.
      document.body.classList.toggle('canvas-drag-invalid', invalid);
      // Dim source item khi vùng invalid.
      for (const el of sourceElsRef.current) {
        el.style.opacity = invalid ? '0.5' : '';
      }
    }
  };

  const onMove = (e: PointerEvent) => {
    const start = startRef.current;
    if (!start) return;

    lastClientRef.current = { x: e.clientX, y: e.clientY };

    if (!draggingRef.current) {
      const dx = e.clientX - start.clientX;
      const dy = e.clientY - start.clientY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      startDrag(start);
    }

    reposition();
    updateZone(e.clientX, e.clientY);
  };

  /** Revert geometry về snapshot trước drag. Dùng cho các drop path chuyển
   *  object rời view (cross-board, Unsort) hoặc vùng invalid — không commit
   *  MoveCommand vì user không muốn dịch chuyển tại chỗ. */
  const revertToBefore = () => {
    const before = beforeRef.current;
    if (!before) return;
    for (const [id, pos] of before) {
      const cur = useObjectsStore.getState().objects.get(id);
      if (!cur) continue;
      const dx = pos.x - cur.geometry.x;
      const dy = pos.y - cur.geometry.y;
      if (dx !== 0 || dy !== 0) applyMoveDelta([id], dx, dy);
    }
  };

  /** Kết thúc drag: cleanup DOM/refs + reset mode + gỡ window listeners.
   *  Gom boilerplate lặp ở mọi drop path và onCancel. */
  const finishDrag = () => {
    cleanup();
    useInteractionStore.getState().setMode('idle');
    teardown();
  };

  const onUp = () => {
    const start = startRef.current;
    if (!start) {
      teardown();
      return;
    }
    if (!draggingRef.current) {
      teardown();
      return;
    }

    const ids = start.ids;
    const before = beforeRef.current;

    // Drop trên trash → xoá.
    if (hoverTrashRef.current) {
      finishDrag();
      deleteObjects(ids);
      return;
    }

    // Drop trên BoardObject tile (khác board hiện tại) → move cross-board.
    // Revert geometry vì object rời view (giữ vị trí cũ trong canvas cha nếu undo).
    const targetBoardTileObjectId = hoveredBoardTileRef.current;
    if (targetBoardTileObjectId) {
      const tileObj = useObjectsStore.getState().objects.get(targetBoardTileObjectId);
      const parsed = tileObj ? boardDataSchema.safeParse(tileObj.data) : null;
      const targetBoardId = parsed?.success ? parsed.data.linkedBoardId : null;
      if (targetBoardId) {
        revertToBefore();
        finishDrag();
        moveObjectsToUnsort(ids, targetBoardId);
        return;
      }
    }

    // Drop trên Unsort target (toggle tab hoặc panel) — object vào Unsort của
    // board hiện tại. Revert geometry trước khi move (object rời view).
    if (hoveredUnsortTargetRef.current) {
      revertToBefore();
      finishDrag();
      moveToUnsortHere(ids);
      return;
    }

    // Drop vùng invalid → revert, không commit.
    if (invalidZoneRef.current) {
      revertToBefore();
      finishDrag();
      return;
    }

    // Drop trên canvas → commit MoveCommand từ before snapshot.
    const after = new Map<string, { x: number; y: number }>();
    for (const id of ids) {
      const o = useObjectsStore.getState().objects.get(id);
      if (o) after.set(id, { x: o.geometry.x, y: o.geometry.y });
    }
    commitMove(before ?? new Map(), after);
    finishDrag();
  };

  const onCancel = () => {
    finishDrag();
  };

  const teardown = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
  };

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Đang edit object này → để renderer nhận pointer (chọn text, focus input).
      if (useInteractionStore.getState().editingId === objectId) return;
      // Modifier pan (middle, Ctrl) → bỏ qua, để surface xử pan.
      if (e.button === 1 || e.ctrlKey || e.metaKey) return;
      if (e.button !== 0) return;
      e.stopPropagation();

      const sel = useSelectionStore.getState();
      // Chọn object: shift toggle, else replace nếu chưa select.
      if (e.shiftKey) {
        sel.toggle(objectId);
      } else if (!sel.selectedIds.has(objectId)) {
        sel.select(objectId);
      }

      const ids = Array.from(useSelectionStore.getState().selectedIds);
      if (ids.length === 0 || !ids.includes(objectId)) return;

      // Grab offset canvas-space = cursor_canvas - primary.geometry (top-left).
      // Absolute logic → cursor luôn giữ đúng grab point suốt drag.
      const primary = useObjectsStore.getState().objects.get(objectId);
      if (!primary) return;
      const p = clientToCanvas(e.clientX, e.clientY, useCameraStore.getState().camera);
      if (!p) return;

      startRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        grabOffsetCanvasX: p.x - primary.geometry.x,
        grabOffsetCanvasY: p.y - primary.geometry.y,
        primaryId: objectId,
        ids,
      };
      draggingRef.current = false;
      hoverTrashRef.current = false;
      invalidZoneRef.current = false;

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    },
    // Deps rỗng vì handlers dùng ref, không phụ thuộc render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [objectId],
  );

  return { onPointerDown };
}
