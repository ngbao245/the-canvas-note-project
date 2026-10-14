import { useEffect } from 'react';
import { getCanvasRepository } from '../api';
import type { Board } from '../types';
import { useCameraStore } from '../store/camera-store';
import { useObjectsStore } from '../store/objects-store';
import { useBoardsStore } from '../store/boards-store';
import { getCameraEngine } from '../engine/camera-engine';
import { useHistoryStore } from '../store/history-store';

/**
 * Sync current board state khi user navigate giữa boards:
 *   - Flush camera persist của board trước (tránh mất state đang debounce).
 *   - Hydrate camera của board mới (snap không ramp).
 *   - Update persist callback trỏ đúng boardId mới.
 *   - Load objects theo boardId.
 *
 * `currentBoardId` luôn là id thật (Home cũng vậy); null = bootstrap chưa xong.
 */
export function useBoardSync({
  currentBoardId,
  rootBoard,
}: {
  currentBoardId: string | null;
  rootBoard: Board | null;
}) {
  useEffect(() => {
    if (!rootBoard || !currentBoardId) return;

    const repo = getCanvasRepository();
    const engine = getCameraEngine();

    const persistBoardId = currentBoardId;
    const target = useBoardsStore.getState().boards.get(persistBoardId);
    if (!target) return; // Invalid — route.tsx sẽ redirect về `/canvas`.

    // Lịch sử undo theo board: nút Undo / Ctrl+Z dùng stack của board vừa vào.
    useHistoryStore.getState().setActiveBoard(persistBoardId);

    // Flush pending trước khi switch (tránh camera board cũ lỡ persist qua board mới).
    engine.flushPersist();
    useCameraStore.getState().hydrate(target.camera);

    engine.setPersistCallback((camera) => {
      void repo.saveCamera(persistBoardId, camera);
    });

    let cancelled = false;
    (async () => {
      try {
        // Đẩy hết phần đang chờ của board cũ trước khi nạp board mới.
        await repo.flush();
        if (cancelled) return;
        const objects = await repo.loadObjects(currentBoardId);
        if (cancelled) return;
        useObjectsStore.getState().hydrate(objects, currentBoardId);
      } catch {
        if (!cancelled) useObjectsStore.getState().hydrate([], currentBoardId);
      }
    })();

    return () => {
      cancelled = true;
      engine.flushPersist();
    };
  }, [currentBoardId, rootBoard]);
}
