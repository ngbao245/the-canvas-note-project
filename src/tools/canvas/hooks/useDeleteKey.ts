import { useEffect } from 'react';
import { useSelectionStore } from '../store/selection-store';
import { isEditableTarget } from '../lib/dom';

/**
 * Bắt phím Delete/Backspace khi có object select và focus không ở input.
 * onTrigger được gọi với danh sách id đang select. Route quyết show confirm dialog hay xoá thẳng.
 */
export function useDeleteKey(onTrigger: (ids: string[]) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (isEditableTarget(e.target)) return;
      const ids = Array.from(useSelectionStore.getState().selectedIds);
      if (ids.length === 0) return;
      e.preventDefault();
      onTrigger(ids);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onTrigger]);
}
