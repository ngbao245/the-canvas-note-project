import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useObjectsStore } from '../store/objects-store';
import { useSelectionStore } from '../store/selection-store';
import { useCameraStore } from '../store/camera-store';
import { useInteractionStore } from '../store/interaction-store';
import { useCanvasDragStore } from '../store/canvas-drag-store';
import { isLockedElsewhere } from '../store/remote-lock-store';
import { showNotice } from '../store/notice-store';
import { getCameraEngine } from '../engine/camera-engine';
import { aabbIntersect, clientToCanvas, visibleCanvasBounds, type Bounds } from '../engine/coord';
import { computeSnapDelta, SNAP_THRESHOLD_PX, type SnapDelta } from '../engine/alignment';
import { computeContentBounds } from '../lib/content-bounds';
import {
  applyMoveDelta,
  bringToFront,
  commitMove,
  deleteObjects,
  moveObjectsToUnsort,
  moveToUnsortHere,
} from '../engine/actions';
import { hitZone, isInvalidZone } from '../lib/hit-test';
import { boardDataSchema, type CanvasObject } from '../types';
import { createEdgePanLoop } from './useEdgePan';
import { isMacSecondaryClick, isPrimaryModifier } from '@/lib/shortcuts';
import { setCursorOverride } from '@/lib/cursor-override';
import { readCssToken } from '@/lib/css-token';

/**
 * Drag object trên canvas — Milanote pattern, unified visualize với toolbar/unsort:
 *
 *   startDrag:
 *     - Source elements: visibility:hidden (vẫn giữ layout trong world layer,
 *       geometry sync ngầm qua applyMoveDelta; user không thấy → cảm giác
 *       "item được cầm ra khỏi world").
 *     - canvas-drag-store.setDrag → FloatingObjectPreview mount (portal body,
 *       screen-space, bay trên toolbar/header/unsort panel).
 *
 *   onMove:
 *     - applyMoveDelta chạy ngầm để geometry.x/y update mỗi frame (edge-pan +
 *       commit MoveCommand khi drop cần đúng geometry cuối).
 *     - KHÔNG hút cạnh lúc kéo — card bám chuột mượt. Khớp cạnh chỉ khi thả
 *       trên canvas (engine/alignment.ts), rồi trượt nhẹ vào chỗ (settleIntoPlace).
 *     - Update store drag position → preview follow cursor.
 *     - updateZone: hover trash/board-tile/unsort/invalid → dim preview + set
 *       hoveredBoardTileId/hoveredUnsortDropTarget cho highlight ring.
 *     - Con trỏ not-allowed qua setCursorOverride + isInvalidZone (chung 3 case).
 *
 *   onUp: xử lý theo zone hover (trash/board-tile/unsort/invalid/canvas), cleanup.
 *
 * Multi-select: tất cả selected hidden tại chỗ + geometry move ngầm. Preview vẽ
 * cả cụm theo con trỏ (CanvasObjectDragPreview), giữ khoảng cách giữa các object.
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
  const beforeRef = useRef<Map<string, { x: number; y: number }> | null>(null);
  /** BoardObject.id đang bị cursor hover khi drag object khác qua. Không phải
   *  linkedBoardId — cần object.id để BoardObject subscribe interaction-store. */
  const hoveredBoardTileRef = useRef<string | null>(null);
  /** Cursor đang hover trên UnsortToggle hoặc UnsortPanel (data-unsort-drop-target). */
  const hoveredUnsortTargetRef = useRef<boolean>(false);

  const cleanup = useCallback(() => {
    edgePanRef.current?.stop();
    edgePanRef.current = null;

    // Restore visibility source elements. Preview đã unmount qua setDrag(null)
    // → item hiện lại vị trí mới (geometry đã update qua applyMoveDelta ngầm).
    for (const el of sourceElsRef.current) {
      el.style.visibility = '';
    }
    sourceElsRef.current = [];

    // Preview off.
    useCanvasDragStore.getState().setDrag(null);

    const trash = document.querySelector('[data-trash-drop]');
    if (trash instanceof HTMLElement) {
      trash.style.background = '';
      trash.style.color = '';
      trash.style.transform = '';
    }

    setCursorOverride(null);
    invalidZoneRef.current = false;
    // Clear board tile hover state.
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
   * pan, item vẫn bám cursor). Chạy ngầm — source hidden, user chỉ thấy preview.
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

  /**
   * Sync canvas-drag-store với cursor + dim state hiện tại. Gọi mỗi frame
   * pointermove để preview follow cursor + dim theo zone.
   */
  const syncPreview = (dim: boolean) => {
    const start = startRef.current;
    if (!start) return;
    const zoom = getCameraEngine().getCamera().zoom;
    useCanvasDragStore.getState().setDrag({
      primaryId: start.primaryId,
      ids: start.ids,
      clientX: lastClientRef.current.x,
      clientY: lastClientRef.current.y,
      // Convert canvas-space grab offset → preview-space (× zoom) vì preview
      // size = geometry × zoom. Cursor giữ đúng grab point trong preview.
      grabOffsetX: start.grabOffsetCanvasX * zoom,
      grabOffsetY: start.grabOffsetCanvasY * zoom,
      dim,
    });
  };

  const startDrag = (start: DragStart) => {
    draggingRef.current = true;
    useInteractionStore.getState().setMode('dragging');

    // Milanote parity: item được cầm lên luôn nổi trên các item khác. Raise
    // geometry.zIndex của primary object (chỉ khi bắt đầu drag thật). Push undo
    // riêng, độc lập với move.
    bringToFront(start.primaryId);

    // Snapshot vị trí ban đầu tất cả selected (dùng commit MoveCommand khi drop).
    const before = new Map<string, { x: number; y: number }>();
    for (const id of start.ids) {
      const o = useObjectsStore.getState().objects.get(id);
      if (o) before.set(id, { x: o.geometry.x, y: o.geometry.y });
    }
    beforeRef.current = before;

    // Hide source elements — geometry vẫn move ngầm qua applyMoveDelta để
    // commit MoveCommand đúng khi drop, edge-pan bám cursor cũng đúng.
    // Preview mount qua canvas-drag-store, portal body → thoát mọi bounded
    // overflow + stacking context của wrapper + surface.
    const sourceEls: HTMLElement[] = [];
    for (const id of start.ids) {
      const el = document.querySelector(`[data-object-id="${id}"]`);
      if (el instanceof HTMLElement) {
        el.style.visibility = 'hidden';
        sourceEls.push(el);
      }
    }
    sourceElsRef.current = sourceEls;

    // Init preview state (chưa dim vì đang trên canvas source point).
    syncPreview(false);

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

  /** Detect vùng cursor + toggle hover state cho các drop target visual feedback.
   *  Return `shouldDim` để syncPreview biết dim preview hay không. */
  const updateZone = (clientX: number, clientY: number): boolean => {
    const zone = hitZone(clientX, clientY);
    const overTrash = zone === 'trash';
    const invalid = isInvalidZone(zone);

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

    // Detect hover trên Unsort drop target (toggle tab hoặc panel).
    const overUnsortTarget = zone === 'unsort';
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
      // Đè toàn trang → cover cả preview element (pointer-events-none).
      setCursorOverride(invalid ? 'not-allowed' : null);
    }

    // Dim preview khi cursor KHÔNG ở canvas trống — nghĩa là hover trash,
    // board tile, unsort target, overlay hoặc ngoài. Feedback trực quan.
    return invalid || overTrash || overBoardTile !== null || overUnsortTarget;
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
    const shouldDim = updateZone(e.clientX, e.clientY);
    syncPreview(shouldDim);
  };

  /** Revert geometry về snapshot trước drag. Dùng cho drop path chuyển object
   *  rời view (cross-board, Unsort) hoặc vùng invalid — không commit MoveCommand
   *  vì user không muốn dịch chuyển tại chỗ. */
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

  /** Kết thúc drag: cleanup DOM/refs + reset mode + gỡ window listeners. */
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
      revertToBefore(); // undo xoá khôi phục đúng chỗ cũ
      finishDrag();
      deleteObjects(ids);
      return;
    }

    // Drop trên BoardObject tile → move cross-board. Revert geometry vì object
    // rời view (giữ vị trí cũ trong canvas cha nếu undo).
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

    // Drop trên Unsort target — object vào Unsort của board hiện tại.
    if (hoveredUnsortTargetRef.current) {
      revertToBefore();
      finishDrag();
      moveToUnsortHere(ids);
      return;
    }

    // Drop vùng invalid → revert.
    if (invalidZoneRef.current) {
      revertToBefore();
      finishDrag();
      return;
    }

    // Drop trên canvas → khớp cạnh (nếu gần) rồi commit MoveCommand từ before
    // snapshot. Lúc kéo không hút để card bám chuột mượt; chỉ khớp khi thả
    // (Milanote parity). Vị trí khớp nằm luôn trong cùng 1 undo entry.
    const snap = computeGroupSnap(ids);
    if (snap.dx !== 0 || snap.dy !== 0) applyMoveDelta(ids, snap.dx, snap.dy);

    const after = new Map<string, { x: number; y: number }>();
    for (const id of ids) {
      const o = useObjectsStore.getState().objects.get(id);
      if (o) after.set(id, { x: o.geometry.x, y: o.geometry.y });
    }
    commitMove(before ?? new Map(), after);
    // Lấy element trước finishDrag (cleanup xoá sourceElsRef).
    const els = sourceElsRef.current;
    finishDrag();
    settleIntoPlace(els, snap.dx, snap.dy);
  };

  const onCancel = () => {
    // Kéo bị huỷ (pointercancel): store đã dời nhưng chưa ghi → trả về chỗ cũ.
    if (draggingRef.current) revertToBefore();
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
      // Middle mouse: bỏ qua, để surface xử pan.
      if (e.button === 1) return;
      if (e.button !== 0) return;
      // macOS Ctrl+click = chuột phải: không chọn, không kéo, để context menu mở.
      if (isMacSecondaryClick(e)) return;

      // Ctrl+click (Cmd trên macOS): multi-select toggle nếu bare click (không drag). Cho
      // event bubble lên surface để Ctrl+drag pan vẫn work — distinguish bằng
      // local pointermove threshold. Xử tách khỏi flow drag object thường vì
      // logic đơn giản hơn (không cần preview, edge-pan, cross-board detect).
      if (isPrimaryModifier(e)) {
        const startX = e.clientX;
        const startY = e.clientY;
        let moved = false;
        const onMoveLocal = (ev: PointerEvent) => {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > DRAG_THRESHOLD) {
            moved = true;
          }
        };
        const onUpLocal = () => {
          window.removeEventListener('pointermove', onMoveLocal);
          window.removeEventListener('pointerup', onUpLocal);
          window.removeEventListener('pointercancel', onUpLocal);
          if (!moved) {
            // Bare Ctrl+click → toggle selection (giống Shift+click). User có
            // 2 cách multi-select: Shift+click và Ctrl+click, đều fire toggle.
            useSelectionStore.getState().toggle(objectId);
          }
        };
        window.addEventListener('pointermove', onMoveLocal);
        window.addEventListener('pointerup', onUpLocal);
        window.addEventListener('pointercancel', onUpLocal);
        return; // KHÔNG stopPropagation — surface Ctrl+drag pan bubble bình thường.
      }

      e.stopPropagation();

      // Tab khác đang sửa object này: không chọn, không kéo (bản ở tab này có thể
      // mang chữ cũ, ghi xuống sẽ đè). Giữ vùng chọn hiện tại.
      if (isLockedElsewhere(objectId)) {
        showNotice('CANVAS.NOTE_LOCK.BUSY');
        return;
      }

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
      lastClientRef.current = { x: e.clientX, y: e.clientY };

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

/**
 * Độ khớp cho cả cụm object vừa thả (khung gộp của cụm).
 * Ứng viên: object canvas cùng view (objects-store chỉ giữ board hiện tại),
 * không thuộc cụm, không nằm trong Unsort, và đang hiện trên màn hình — không
 * hút vào thứ người dùng không thấy.
 */
function computeGroupSnap(ids: string[]): SnapDelta {
  const engine = getCameraEngine();
  const camera = engine.getCamera();
  const objects = useObjectsStore.getState().objects;
  const dragging = new Set(ids);

  const group = computeContentBounds(
    ids.map((id) => objects.get(id)).filter((o): o is CanvasObject => o !== undefined),
  );
  if (!group) return { dx: 0, dy: 0 };

  const viewport = visibleCanvasBounds(camera, engine.getViewport());
  const others: Bounds[] = [];
  for (const o of objects.values()) {
    if (dragging.has(o.id) || o.unsortIndex !== null) continue;
    if (viewport && !aabbIntersect(o.geometry, viewport)) continue;
    others.push(o.geometry);
  }

  return computeSnapDelta(group, others, SNAP_THRESHOLD_PX / camera.zoom);
}

/** Thời gian card trượt vào chỗ khớp sau khi thả. Ngắn để không thấy trễ. */
const SETTLE_MS = 120;

/**
 * Hiệu ứng trượt vào chỗ khớp sau khi thả. Store đã giữ vị trí khớp; đây chỉ
 * là phần nhìn: khối card đi từ chỗ thả (-dx, -dy) về 0 bằng thuộc tính
 * `translate` (tách khỏi `transform`, không đụng style khác). Đơn vị
 * canvas-space vì card nằm trong world layer đã scale zoom.
 *
 * Viền chọn nằm trong khối card (SelectionBox) nên tự trượt theo, không cần
 * animate riêng. Animation bắt đầu ngay (đồng bộ) nên frame paint đầu tiên
 * sau khi React render vị trí mới đã có translate → không nháy chỗ khớp.
 */
function settleIntoPlace(els: HTMLElement[], dx: number, dy: number): void {
  if (dx === 0 && dy === 0) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const from = `${-dx}px ${-dy}px`;
  // el.animate không nhận var() → đọc token lúc chạy (1 lần mỗi lần thả).
  const easing = readCssToken('--easing-standard', 'ease');
  for (const el of els) {
    el.animate([{ translate: from }, { translate: '0px 0px' }], {
      duration: SETTLE_MS,
      easing,
    });
  }
}
