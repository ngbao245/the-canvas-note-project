import { bindShortcuts, useShortcutLayer } from '@/lib/shortcuts';
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
import { CANVAS_SHORTCUT_DEFS } from '../shortcuts';
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

function selectedIds(): string[] {
  return Array.from(useSelectionStore.getState().selectedIds);
}

/** Zoom bằng phím: anchor tâm viewport (bàn phím không có vị trí chuột). deltaY < 0 → zoom in. */
function zoomFromKeyboard(direction: -1 | 1): void {
  const engine = getCameraEngine();
  const vp = engine.getViewport();
  engine.zoomImpulse({ x: vp.width / 2, y: vp.height / 2 }, direction);
}

/** Ctrl+C / Ctrl+X. Reset pasteCounter để Ctrl+V kế tiếp bắt đầu lại từ cạnh object gốc. */
function copySelection(cut: boolean): boolean {
  const objs = selectedCanvasObjects();
  if (objs.length === 0) return false; // để trình duyệt copy chữ đang bôi đen
  void writeCanvasClipboard(objs);
  useInteractionStore.getState().setPasteCounter(0);
  if (cut) deleteObjects(objs.map((o) => o.id));
  return true;
}

/**
 * Đổi thứ tự lớp (geometry.zIndex) cho mọi object đang chọn. Không chọn gì vẫn nuốt phím (không trả false): Ctrl/Cmd+[ / ]
 * là Back/Forward của trình duyệt Mac, rơi xuống là bị đẩy ra khỏi canvas (spec shortcuts US-8).
 */
function stack(action: (id: string) => void): void {
  for (const id of selectedIds()) action(id);
}

/**
 * Phím canvas chung (lớp tool). Tổ hợp + nhãn khai báo ở `../shortcuts.ts`.
 *
 * Mọi Ctrl-zoom (wheel + phím) nhắm canvas, không để trình duyệt zoom trang: Ctrl+= / - / 0
 * được consume (preventDefault). Ctrl+wheel xử ở CanvasSurface.
 *
 * Lớp tool không chạy khi đang gõ chữ → Esc / Enter / Ctrl+Z trong note do Tiptap tự xử.
 * `run` trả false = không có gì để làm → phím rơi xuống trình duyệt (VD Ctrl+C chữ thường).
 */
export function useCanvasKeys({ onFit, onReset }: { onFit: () => void; onReset: () => void }) {
  const shortcuts = bindShortcuts(CANVAS_SHORTCUT_DEFS, {
    'canvas.undo': {
      run: () => {
        useHistoryStore.getState().undo();
      },
    },
    'canvas.redo': {
      run: () => {
        useHistoryStore.getState().redo();
      },
    },
    'canvas.copy': { run: () => copySelection(false) },
    'canvas.cut': { run: () => copySelection(true) },
    // Paste lệch dần (Milanote parity): lần N đặt tại gốc + N×16. Không dùng vị trí chuột.
    // Đọc clipboard async: consume ngay, xử lý chạy nền.
    'canvas.paste': {
      run: () => {
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
      },
    },
    // Không đụng clipboard system. Không có gì chọn → để trình duyệt xử (bookmark).
    'canvas.duplicate': {
      run: () => {
        const ids = selectedIds();
        if (ids.length === 0) return false;
        duplicateObjects(ids);
      },
    },
    // Vào edit object đang chọn (như double-click). Không có editingClickPoint → caret cuối.
    'canvas.edit-selected': {
      run: () => {
        const sel = useSelectionStore.getState().selectedIds;
        if (sel.size !== 1) return false;
        if (useInteractionStore.getState().editingId !== null) return false;
        const [id] = sel;
        useInteractionStore.getState().setEditingId(id, null);
      },
    },
    // Ctrl+A Unsort ở lớp panel (UnsortPanel.tsx).
    'canvas.select-all': {
      when: () => useUnsortStore.getState().activePanel === 'canvas',
      run: () => {
        const boardId = useCurrentBoardStore.getState().currentBoardId;
        const ids: string[] = [];
        for (const o of useObjectsStore.getState().objects.values()) {
          if (o.boardId === boardId && o.unsortIndex === null) ids.push(o.id);
        }
        if (ids.length > 0) useSelectionStore.getState().replace(ids);
      },
    },
    // Esc tầng 2: bỏ chọn. Tầng 1 (thoát edit) do NoteEditor xử.
    'canvas.deselect': {
      run: () => {
        if (useSelectionStore.getState().selectedIds.size === 0) return false;
        useSelectionStore.getState().clear();
      },
    },
    'canvas.fit': {
      run: () => {
        onFit();
      },
    },
    'canvas.reset-view': {
      run: () => {
        onReset();
      },
    },
    'canvas.zoom-in': {
      run: () => {
        zoomFromKeyboard(-1);
      },
    },
    'canvas.zoom-out': {
      run: () => {
        zoomFromKeyboard(1);
      },
    },
    'canvas.layer-up': { run: () => stack(bringForward) },
    'canvas.layer-down': { run: () => stack(sendBackward) },
    'canvas.layer-top': { run: () => stack(bringToFront) },
    'canvas.layer-bottom': { run: () => stack(sendToBack) },
  });

  useShortcutLayer('tool', shortcuts);
}
