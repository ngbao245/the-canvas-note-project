import { useEffect } from 'react';
import { useHistoryStore } from '../store/history-store';
import { useSelectionStore } from '../store/selection-store';
import { bringForward, bringToFront, sendBackward, sendToBack } from '../engine/actions';
import { isEditableTarget } from '../lib/dom';

/**
 * Keyboard shortcut chung của canvas:
 *   Ctrl/Cmd + Z          → undo
 *   Ctrl/Cmd + Shift + Z  → redo
 *   Ctrl/Cmd + Y          → redo (alternative Windows)
 *   Ctrl/Cmd + ]          → bring forward (nâng 1 nấc)
 *   Ctrl/Cmd + [          → send backward (hạ 1 nấc)
 *   Ctrl/Cmd + Shift + ]  → bring to front
 *   Ctrl/Cmd + Shift + [  → send to back
 *   F                     → fit content (callback nhận từ ngoài)
 *   0                     → reset view
 *
 * Bỏ qua khi focus ở input/textarea/contentEditable.
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
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFit, onReset]);
}
