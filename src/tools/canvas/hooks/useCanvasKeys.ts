import { useEffect } from 'react';
import { useHistoryStore } from '../store/history-store';
import { isEditableTarget } from '../lib/dom';

/**
 * Keyboard shortcut chung của canvas:
 *   Ctrl/Cmd + Z          → undo
 *   Ctrl/Cmd + Shift + Z  → redo
 *   Ctrl/Cmd + Y          → redo (alternative Windows)
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
