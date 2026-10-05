import { useEffect } from 'react';
import { useHistoryStore } from '../store/history-store';
import { useSelectionStore } from '../store/selection-store';
import { useObjectsStore } from '../store/objects-store';
import { useInteractionStore } from '../store/interaction-store';
import { useUnsortStore } from '../store/unsort-store';
import { useCurrentBoardStore } from '../store/current-board-store';
import {
  bringForward,
  bringToFront,
  deleteObjects,
  duplicateObjects,
  pasteObjects,
  sendBackward,
  sendToBack,
} from '../engine/actions';
import { getCameraEngine } from '../engine/camera-engine';
import { readCanvasClipboard, writeCanvasClipboard } from '../lib/clipboard';
import { isEditableTarget } from '../lib/dom';
import type { CanvasObject } from '../types';

/** Offset canvas-space giữa các bản paste liên tiếp (Ctrl+V lặp). 16px khớp
 *  offset mặc định của Ctrl+D trong duplicateObjects. */
const PASTE_OFFSET_STEP = 16;

/** Object đang chọn và nằm trên canvas (bỏ item trong Unsort). Copy/cut chỉ
 *  áp cho nhóm này — paste luôn đặt lên canvas, không giữ ngữ nghĩa Unsort. */
function selectedCanvasObjects(): CanvasObject[] {
  const objects = useObjectsStore.getState().objects;
  const result: CanvasObject[] = [];
  for (const id of useSelectionStore.getState().selectedIds) {
    const o = objects.get(id);
    if (o && o.unsortIndex === null) result.push(o);
  }
  return result;
}

/**
 * Keyboard shortcut chung của canvas:
 *   Ctrl/Cmd + Z          → undo
 *   Ctrl/Cmd + Shift + Z  → redo
 *   Ctrl/Cmd + Y          → redo (alternative Windows)
 *   Ctrl/Cmd + ]          → bring forward (nâng 1 nấc)
 *   Ctrl/Cmd + [          → send backward (hạ 1 nấc)
 *   Ctrl/Cmd + Shift + ]  → bring to front
 *   Ctrl/Cmd + Shift + [  → send to back
 *   Ctrl/Cmd + = / +      → zoom in (override browser page zoom, notch ZOOM_STEP_IN)
 *   Ctrl/Cmd + -          → zoom out (override browser page zoom, notch ZOOM_STEP_OUT)
 *   Ctrl/Cmd + 0          → reset view (override browser reset zoom trang)
 *   Ctrl/Cmd + A          → select all object canvas board hiện tại (chỉ khi
 *                            activePanel === 'canvas', Unsort có Ctrl+A riêng)
 *   Ctrl/Cmd + C          → copy object đang chọn ra clipboard system (magic
 *                            prefix canvas-clip:v1:)
 *   Ctrl/Cmd + V          → paste lệch dần: lần N đặt tại gốc + N×16 (pasteCounter,
 *                            reset mỗi lần Ctrl+C/X)
 *   Ctrl/Cmd + X          → cut = copy + delete
 *   Ctrl/Cmd + D          → duplicate object đang chọn tại offset +16/+16
 *   F                     → fit content (callback nhận từ ngoài)
 *   0                     → reset view (bare)
 *   Escape                → tier 2 dismiss (khi editingId null): clear selection.
 *                            Tier 1 (thoát edit) do NoteEditor keydown xử riêng.
 *   Enter                 → single selection + không editing → vào edit mode
 *                            object đang chọn (như double-click, không có
 *                            editingClickPoint → renderer fallback focus end).
 *
 * Ctrl+wheel zoom canvas được handle trong CanvasSurface (native wheel listener
 * passive:false → preventDefault chặn browser page zoom). RULE cứng: mọi
 * Ctrl-zoom (wheel + keyboard) đều nhắm canvas, không được để browser zoom trang.
 *
 * Bỏ qua khi focus ở input/textarea/contentEditable. Editor Escape tier 1 và
 * paragraph Enter trong Tiptap do NoteEditor xử riêng — isEditableTarget guard
 * ở đầu handler này skip đúng case đó.
 */
export function useCanvasKeys({
  onFit,
  onReset,
}: {
  onFit: () => void;
  onReset: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) useHistoryStore.getState().redo();
        else useHistoryStore.getState().undo();
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        useHistoryStore.getState().redo();
        return;
      }
      // Stacking (Layer 1 — canvas object zIndex). Áp cho mọi object đang chọn.
      // Ctrl+] forward, Ctrl+[ backward, thêm Shift → front/back tuyệt đối.
      if (mod && (e.key === ']' || e.key === '[')) {
        const ids = Array.from(useSelectionStore.getState().selectedIds);
        if (ids.length === 0) return;
        e.preventDefault();
        const toFront = e.key === ']';
        const action = e.shiftKey
          ? toFront ? bringToFront : sendToBack
          : toFront ? bringForward : sendBackward;
        for (const id of ids) action(id);
        return;
      }
      // Ctrl/Cmd + = / + → zoom in canvas (đè browser page zoom).
      // Key '=' khi press bare '=', '+' khi có Shift. Cover cả 2.
      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        const engine = getCameraEngine();
        const vp = engine.getViewport();
        // Anchor tâm viewport (keyboard không có cursor). deltaY < 0 → zoom in.
        engine.zoomImpulse({ x: vp.width / 2, y: vp.height / 2 }, -1);
        return;
      }
      // Ctrl/Cmd + - → zoom out canvas.
      if (mod && e.key === '-') {
        e.preventDefault();
        const engine = getCameraEngine();
        const vp = engine.getViewport();
        engine.zoomImpulse({ x: vp.width / 2, y: vp.height / 2 }, 1);
        return;
      }
      // Ctrl/Cmd + 0 → reset view (đè browser reset zoom trang mặc định).
      if (mod && e.key === '0') {
        e.preventDefault();
        onReset();
        return;
      }
      // Ctrl/Cmd + A → select all object canvas board hiện tại. Chỉ khi
      // activePanel === 'canvas'; nếu 'unsort' → Ctrl+A cho Unsort do
      // UnsortPanel handler riêng xử (isEditableTarget skip ở đầu func + handler
      // Unsort trong UnsortPanel.tsx tự attach global keydown).
      if (mod && (e.key === 'a' || e.key === 'A')) {
        if (useUnsortStore.getState().activePanel !== 'canvas') return;
        e.preventDefault();
        const boardId = useCurrentBoardStore.getState().currentBoardId;
        const ids: string[] = [];
        for (const o of useObjectsStore.getState().objects.values()) {
          if (o.boardId === boardId && o.unsortIndex === null) ids.push(o.id);
        }
        if (ids.length > 0) useSelectionStore.getState().replace(ids);
        return;
      }
      // Ctrl/Cmd + C / X → copy (cut thì xoá thêm). Reset pasteCounter để
      // Ctrl+V kế tiếp bắt đầu lại từ cạnh object gốc.
      if (mod && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X')) {
        const objs = selectedCanvasObjects();
        if (objs.length === 0) return;
        e.preventDefault();
        void writeCanvasClipboard(objs);
        useInteractionStore.getState().setPasteCounter(0);
        if (e.key === 'x' || e.key === 'X') deleteObjects(objs.map((o) => o.id));
        return;
      }
      // Ctrl/Cmd + D → duplicate object đang chọn tại offset +16/+16. Không
      // đụng clipboard system (không share với Ctrl+C/V flow).
      if (mod && (e.key === 'd' || e.key === 'D')) {
        const ids = Array.from(useSelectionStore.getState().selectedIds);
        if (ids.length === 0) return;
        e.preventDefault();
        duplicateObjects(ids);
        return;
      }
      // Ctrl/Cmd + V → paste lệch dần (Milanote parity): lần 1 cạnh gốc +16,
      // lần 2 +32... chuỗi chéo, không đè nhau. Không dùng vị trí chuột.
      if (mod && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        void (async () => {
          const payload = await readCanvasClipboard();
          if (!payload) return; // clipboard rỗng hoặc không phải canvas-clip
          const n = useInteractionStore.getState().pasteCounter + 1;
          useInteractionStore.getState().setPasteCounter(n);
          const step = n * PASTE_OFFSET_STEP;
          const boardId = useCurrentBoardStore.getState().currentBoardId;
          if (!boardId) return; // bootstrap chưa xong
          pasteObjects(payload.objects, { dx: step, dy: step }, boardId);
        })();
        return;
      }
      if (!mod && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        onFit();
        return;
      }
      if (!mod && e.key === '0') {
        e.preventDefault();
        onReset();
        return;
      }
      // Escape tier 2 → clear selection. Tier 1 (thoát edit khi editingId set)
      // do NoteEditor keydown handler xử riêng — isEditableTarget guard ở đầu
      // function skip case đó. Path này chỉ cho selection không edit.
      if (!mod && e.key === 'Escape') {
        if (useSelectionStore.getState().selectedIds.size === 0) return;
        e.preventDefault();
        useSelectionStore.getState().clear();
        return;
      }
      // Enter → vào edit mode single-selected object (như double-click). Multi
      // select → skip (deterministic). Không editingClickPoint → NoteEditor
      // fallback focus end.
      if (!mod && e.key === 'Enter') {
        const sel = useSelectionStore.getState().selectedIds;
        if (sel.size !== 1) return;
        if (useInteractionStore.getState().editingId !== null) return;
        e.preventDefault();
        const [id] = sel;
        useInteractionStore.getState().setEditingId(id, null);
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFit, onReset]);
}
