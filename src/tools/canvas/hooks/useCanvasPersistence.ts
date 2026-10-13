import { useEffect } from 'react';
import { getCanvasRepository } from '../api';
import { useObjectsStore } from '../store/objects-store';
import { useCurrentBoardStore } from '../store/current-board-store';
import { useInteractionStore } from '../store/interaction-store';
import { onTabMessage } from '../lib/tab-channel';
import { startEditLocks } from '../lib/edit-locks';

/**
 * Lưu bền + đồng bộ giữa tab (spec canvas-note-autosave), gắn 1 lần ở route canvas:
 *   - Ẩn tab / đóng tab → đẩy gấp phần đang chờ ghi (không chờ lô đang chạy).
 *   - Tab khác ghi xong object → đọc lại từ IndexedDB, cập nhật store. Không thêm
 *     bước undo, không ghi lại. Bỏ qua object tab này còn thay đổi chưa ghi
 *     (bản trong store mới hơn) và object đang sửa.
 *   - Khoá sửa giữa tab (lib/edit-locks.ts).
 */
export function useCanvasPersistence(): void {
  useEffect(() => {
    const repo = getCanvasRepository();

    const flushNow = () => void repo.flush({ urgent: true });
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushNow();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushNow);

    const unsubTab = onTabMessage((msg) => {
      if (msg.type !== 'objects') return;
      const store = useObjectsStore.getState();
      for (const id of msg.deletes) {
        if (!repo.hasPendingWrite(id)) store.remove(id);
      }
      for (const id of msg.puts) void reloadObject(id);
    });

    const stopLocks = startEditLocks();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushNow);
      unsubTab();
      stopLocks();
      flushNow();
    };
  }, []);
}

async function reloadObject(id: string): Promise<void> {
  const repo = getCanvasRepository();
  if (repo.hasPendingWrite(id)) return;
  const obj = await repo.loadObject(id);
  // Kiểm lại sau khi đọc: trong lúc chờ có thể tab này đã sửa object đó.
  if (repo.hasPendingWrite(id)) return;
  if (useInteractionStore.getState().editingId === id) return;
  const store = useObjectsStore.getState();
  const view = useCurrentBoardStore.getState().currentBoardId;
  if (obj && obj.boardId === view) store.add(obj);
  else if (store.objects.has(id)) store.remove(id);
}
