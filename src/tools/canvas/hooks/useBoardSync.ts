import { useEffect } from 'react';
import { getCanvasRepository } from '../api';
import type { Board } from '../types';
import { useCameraStore } from '../store/camera-store';
import { useObjectsStore } from '../store/objects-store';
import { useBoardsStore } from '../store/boards-store';
import { getCameraEngine } from '../engine/camera-engine';

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

    // Flush pending trước khi switch (tránh camera board cũ lỡ persist qua board mới).
    engine.flushPersist();
    useCameraStore.getState().hydrate(target.camera);

    engine.setPersistCallback((camera) => {
      void repo.saveCamera(persistBoardId, camera);
    });

    let cancelled = false;
    (async () => {
      try {
        const objects = await repo.loadObjects(currentBoardId);
        if (cancelled) return;
        useObjectsStore.getState().hydrate(objects);
      } catch {
        if (!cancelled) useObjectsStore.getState().hydrate([]);
      }
    })();

    return () => {
      cancelled = true;
      engine.flushPersist();
    };
  }, [currentBoardId, rootBoard]);
}
