import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useObjectsStore } from '../store/objects-store';
import { useSelectionStore } from '../store/selection-store';
import { useCameraStore } from '../store/camera-store';
import { useInteractionStore } from '../store/interaction-store';
import { getCameraEngine } from '../engine/camera-engine';
import { applyMoveDelta, commitMove, deleteObjects } from '../engine/actions';
import { computeContentBounds } from '../lib/content-bounds';

const EDGE_ZONE = 60; // px từ rìa surface bắt đầu auto-pan
const EDGE_MAX_SPEED = 8; // px/frame ở rìa tuyệt đối

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
  const panRafRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (panRafRef.current !== null) {
      cancelAnimationFrame(panRafRef.current);
      panRafRef.current = null;
    }
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
    const surface = document.querySelector('[data-canvas-surface]');
    if (!(surface instanceof HTMLElement)) return;
    const rect = surface.getBoundingClientRect();
    const cursor = lastClientRef.current;
    const cam = getCameraEngine().getCamera();
    const cursorCanvasX = (cursor.x - rect.left - cam.x) / cam.zoom;
    const cursorCanvasY = (cursor.y - rect.top - cam.y) / cam.zoom;
    const targetPrimaryX = cursorCanvasX - start.grabOffsetCanvasX;
    const targetPrimaryY = cursorCanvasY - start.grabOffsetCanvasY;
    const primary = useObjectsStore.getState().objects.get(start.primaryId);
    if (!primary) return;
    const dx = targetPrimaryX - primary.geometry.x;
    const dy = targetPrimaryY - primary.geometry.y;
    if (dx === 0 && dy === 0) return;
    applyMoveDelta(start.ids, dx, dy);
  };

  /**
   * Edge auto-pan loop: khi cursor gần rìa surface (< EDGE_ZONE) và KHÔNG trên
   * overlay (toolbar/trash), pan camera theo hướng đó. Item tự bám cursor qua
   * reposition() vì camera đổi thay đổi mapping screen→canvas.
   * Cursor trong overlay → skip pan (để user thả vào trash được).
   */
  const panLoopStep = () => {
    const start = startRef.current;
    if (!start || !draggingRef.current) {
      panRafRef.current = null;
      return;
    }
    const surface = document.querySelector('[data-canvas-surface]');
    const cursor = lastClientRef.current;
    if (!(surface instanceof HTMLElement)) {
      panRafRef.current = requestAnimationFrame(panLoopStep);
      return;
    }
    // Edge-pan CHỈ chạy khi cursor trực tiếp trên vùng canvas trống:
    //   - Phải trong surface (không phải header/workspace-bar).
    //   - Không trên overlay (toolbar/trash).
    // Ngoài các case đó → skip, không đẩy canvas theo hướng cursor.
    const target = document.elementFromPoint(cursor.x, cursor.y);
    const onSurface = target instanceof Element && target.closest('[data-canvas-surface]');
    const onOverlay = target instanceof Element && target.closest('[data-canvas-overlay]');
    if (!onSurface || onOverlay) {
      panRafRef.current = requestAnimationFrame(panLoopStep);
      return;
    }
    const rect = surface.getBoundingClientRect();
    let panDx = 0;
    let panDy = 0;
    const dxLeft = cursor.x - rect.left;
    const dxRight = rect.right - cursor.x;
    const dyTop = cursor.y - rect.top;
    const dyBottom = rect.bottom - cursor.y;
    if (dxLeft < EDGE_ZONE) panDx = -((EDGE_ZONE - dxLeft) / EDGE_ZONE) * EDGE_MAX_SPEED;
    else if (dxRight < EDGE_ZONE) panDx = ((EDGE_ZONE - dxRight) / EDGE_ZONE) * EDGE_MAX_SPEED;
    if (dyTop < EDGE_ZONE) panDy = -((EDGE_ZONE - dyTop) / EDGE_ZONE) * EDGE_MAX_SPEED;
    else if (dyBottom < EDGE_ZONE) panDy = ((EDGE_ZONE - dyBottom) / EDGE_ZONE) * EDGE_MAX_SPEED;

    // Milanote-style: chỉ pan trục có content vượt viewport bên phía đó. Nếu tất cả
    // content fit trong viewport theo trục nào → skip pan trục đó. Loại item đang
    // kéo khỏi bounds check để hành vi không phụ thuộc chính item đang kéo.
    const excludeIds = new Set(start.ids);
    const others = Array.from(useObjectsStore.getState().objects.values()).filter(
      (o) => !excludeIds.has(o.id),
    );
    const bounds = computeContentBounds(others);
    const cam = getCameraEngine().getCamera();
    if (bounds) {
      const contentLeft = bounds.x * cam.zoom + cam.x; // screen coord, relative surface origin
      const contentRight = (bounds.x + bounds.width) * cam.zoom + cam.x;
      const contentTop = bounds.y * cam.zoom + cam.y;
      const contentBottom = (bounds.y + bounds.height) * cam.zoom + cam.y;
      const viewW = rect.width;
      const viewH = rect.height;
      if (panDx < 0 && contentLeft >= 0) panDx = 0; // không có content bên trái → skip pan left
      if (panDx > 0 && contentRight <= viewW) panDx = 0;
      if (panDy < 0 && contentTop >= 0) panDy = 0;
      if (panDy > 0 && contentBottom <= viewH) panDy = 0;
    } else {
      // Không có content khác → skip pan (chỉ có item đang kéo).
      panDx = 0;
      panDy = 0;
    }

    if (panDx !== 0 || panDy !== 0) {
      getCameraEngine().pan({ x: -panDx, y: -panDy });
      reposition();
    }
    panRafRef.current = requestAnimationFrame(panLoopStep);
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

    panRafRef.current = requestAnimationFrame(panLoopStep);
  };

  /** Detect vùng cursor:
   *   - Trash: valid drop = delete
   *   - Canvas surface: valid drop = move
   *   - Overlay khác trash (toolbar body): invalid → revert
   *   - Ngoài toàn bộ (header/document): invalid → revert
   */
  const updateZone = (clientX: number, clientY: number) => {
    const target = document.elementFromPoint(clientX, clientY);
    let overTrash = false;
    let invalid = false;
    if (target instanceof Element) {
      if (target.closest('[data-trash-drop]')) overTrash = true;
      else if (target.closest('[data-canvas-overlay]')) invalid = true;
      else if (!target.closest('[data-canvas-surface]')) invalid = true;
    } else {
      invalid = true;
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
      const surface = document.querySelector('[data-canvas-surface]');
      if (!(surface instanceof HTMLElement)) return;
      const sRect = surface.getBoundingClientRect();
      const cam = useCameraStore.getState().camera;
      const cursorCanvasX = (e.clientX - sRect.left - cam.x) / cam.zoom;
      const cursorCanvasY = (e.clientY - sRect.top - cam.y) / cam.zoom;

      startRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        grabOffsetCanvasX: cursorCanvasX - primary.geometry.x,
        grabOffsetCanvasY: cursorCanvasY - primary.geometry.y,
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
