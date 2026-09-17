import { useEffect, useState } from 'react';
import { getCanvasRepository } from '../api';
import { makeDefaultBoard, type Board } from '../types';
import { useCameraStore } from '../store/camera-store';
import { useObjectsStore } from '../store/objects-store';
import { getCameraEngine } from '../engine/camera-engine';

type BootstrapState =
  | { phase: 'loading' }
  | { phase: 'ready'; rootBoard: Board }
  | { phase: 'error'; message: string };

/**
 * Bootstrap canvas: load boards + objects từ IndexedDB, tạo root board nếu chưa có,
 * hydrate camera + objects. Đăng ký persist callback cho engine (debounce 500ms).
 */
export function useCanvasBootstrap(): { state: BootstrapState } {
  const [state, setState] = useState<BootstrapState>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const repo = getCanvasRepository();
        let boards = await repo.loadBoards();
        let rootBoard = boards.find((b) => b.parentId === null);

        if (!rootBoard) {
          rootBoard = makeDefaultBoard();
          await repo.saveBoard(rootBoard);
          boards = [rootBoard];
        }

        // Hydrate camera qua store (delegate về engine.hydrate — snap không ramp).
        useCameraStore.getState().hydrate(rootBoard.camera);

        // Đăng ký persist callback: engine tự trailing-debounce 500ms.
        const targetBoardId = rootBoard.id;
        getCameraEngine().setPersistCallback((camera) => {
          void repo.saveCamera(targetBoardId, camera);
        });

        const objects = await repo.loadObjects(null);
        if (cancelled) return;
        useObjectsStore.getState().hydrate(objects);

        setState({ phase: 'ready', rootBoard });
      } catch (err) {
        if (cancelled) return;
        setState({
          phase: 'error',
          message: err instanceof Error ? err.message : 'Không rõ lỗi',
        });
      }
    })();

    return () => {
      cancelled = true;
      // Flush persist khi unmount, tránh mất state đang debounce.
      getCameraEngine().flushPersist();
    };
  }, []);

  return { state };
}
