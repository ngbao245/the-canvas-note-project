import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useObjectsStore } from '../store/objects-store';
import { useSelectionStore } from '../store/selection-store';
import { useCameraStore } from '../store/camera-store';
import { useInteractionStore } from '../store/interaction-store';
import { getCameraEngine } from '../engine/camera-engine';
import { clientToCanvas } from '../engine/coord';
import { applyMoveDelta, commitMove, deleteObjects } from '../engine/actions';
import { hitZone } from '../lib/hit-test';
import { createEdgePanLoop } from './useEdgePan';

/**
 * Drag object trên canvas theo pattern Milanote (motion-rules Paradigm 2):
 *   - pointerdown: ghi điểm bắt đầu + grab offset (cursor relative to object).
 *   - pointermove vượt threshold → START:
 *       + Source object: opacity 0.4 + scale 0.96 + brightness 0.9 (mờ tại chỗ).
 *       + Floating preview clone follow cursor với grab offset đúng.
 *   - pointermove tiếp: cập nhật preview position + check hover trash.
 *   - pointerup:
 *       + Chưa vượt threshold → không phải drag (select đã xử trước).
 *       + Đang drag + hover trash → deleteObjects(selected).
 *       + Đang drag + không trash → move tất cả selected theo delta screen→canvas.
 *
 * Multi-select: preview chỉ hiện item chính (item được pointerdown), tất cả
 * selected mờ đi. Move/delete áp cho toàn bộ selected.
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
    // Restore lift effect trên tất cả object đang drag.
    for (const el of sourceElsRef.current) {
      el.style.transform = '';
      el.style.boxShadow = '';
      el.style.transition = '';
      el.style.zIndex = '';
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

  const startDrag = (start: DragStart) => {
    draggingRef.current = true;
    useInteractionStore.getState().setMode('dragging');

    // Snapshot vị trí ban đầu tất cả selected (dùng commit MoveCommand khi drop).
    const before = new Map<string, { x: number; y: number }>();
    for (const id of start.ids) {
      const o = useObjectsStore.getState().objects.get(id);
      if (o) before.set(id, { x: o.geometry.x, y: o.geometry.y });
    }
    beforeRef.current = before;

    // Lift effect: item chính scale up + shadow, nổi lên trên các item khác.
    const sourceEls: HTMLElement[] = [];
    for (const id of start.ids) {
      const el = document.querySelector(`[data-object-id="${id}"]`);
      if (el instanceof HTMLElement) {
        el.style.transition = 'box-shadow 80ms, transform 80ms';
        el.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.35)';
        el.style.zIndex = '9999';
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
   *   - Canvas surface: valid drop = move
   *   - Overlay khác trash (toolbar body): invalid → revert
   *   - Ngoài toàn bộ (header/document): invalid → revert
   */
  const updateZone = (clientX: number, clientY: number) => {
    const zone = hitZone(clientX, clientY);
    // trash = drop xoá; canvas = drop move (valid); overlay/outside = invalid revert.
    const overTrash = zone === 'trash';
    const invalid = zone === 'overlay' || zone === 'outside';

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
      // Item visual feedback: dim khi invalid.
      for (const el of sourceElsRef.current) {
        el.style.opacity = invalid ? '0.5' : '';
      }
    }
  };

  const onMove = (e: PointerEvent) => {
    const start = startRef.current;
    if (!start) return;

    if (!draggingRef.current) {
      const dx = e.clientX - start.clientX;
      const dy = e.clientY - start.clientY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      startDrag(start);
    }

    lastClientRef.current = { x: e.clientX, y: e.clientY };
    reposition();
    updateZone(e.clientX, e.clientY);
  };

  const onUp = () => {
    const start = startRef.current;
    if (!start) {
      teardown();
      return;
    }
    const wasDragging = draggingRef.current;
    const overTrash = hoverTrashRef.current;
    const ids = start.ids;

    if (!wasDragging) {
      teardown();
      return;
    }

    const invalidZone = invalidZoneRef.current;
    const before = beforeRef.current;

    // Drop trên trash → xoá.
    if (overTrash) {
      cleanup();
      useInteractionStore.getState().setMode('idle');
      deleteObjects(ids);
      teardown();
      return;
    }

    // Drop vùng invalid (ngoài canvas, không phải trash) → REVERT về vị trí ban đầu.
    // Không commit MoveCommand vì user không muốn dịch chuyển.
    if (invalidZone) {
      if (before) {
        for (const [id, pos] of before) {
          const cur = useObjectsStore.getState().objects.get(id);
          if (!cur) continue;
          const dx = pos.x - cur.geometry.x;
          const dy = pos.y - cur.geometry.y;
          if (dx !== 0 || dy !== 0) applyMoveDelta([id], dx, dy);
        }
      }
      cleanup();
      useInteractionStore.getState().setMode('idle');
      teardown();
      return;
    }

    // Drop trên canvas → commit MoveCommand từ before snapshot.
    const after = new Map<string, { x: number; y: number }>();
    for (const id of ids) {
      const o = useObjectsStore.getState().objects.get(id);
      if (o) after.set(id, { x: o.geometry.x, y: o.geometry.y });
    }
    commitMove(before ?? new Map(), after);

    cleanup();
    useInteractionStore.getState().setMode('idle');
    teardown();
  };

  const onCancel = () => {
    cleanup();
    useInteractionStore.getState().setMode('idle');
    teardown();
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
