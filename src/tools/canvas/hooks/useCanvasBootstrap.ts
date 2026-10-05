import { useEffect, useState } from 'react';
import { getCanvasRepository } from '../api';
import { makeDefaultBoard, type Board } from '../types';
import { useBoardsStore } from '../store/boards-store';
import { migrateRootObjects, normalizeBoards } from '../lib/board-tree';

type BootstrapState =
  | { phase: 'loading' }
  | { phase: 'ready'; rootBoard: Board }
  | { phase: 'error'; message: string };

/**
 * Bootstrap canvas 1 lần lúc mount: load toàn bộ Board records từ IDB → hydrate
 * boards-store, ensure rootBoard tồn tại (parentId=null). Sau đó `useBoardSync`
 * lo phần load objects + hydrate camera + persist callback theo currentBoardId.
 *
 * KHÔNG load objects ở đây — objects load lại mỗi lần switch board, thuộc trách
 * nhiệm của useBoardSync.
 */
export function useCanvasBootstrap(): { state: BootstrapState } {
  const [state, setState] = useState<BootstrapState>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const repo = getCanvasRepository();
        const normalized = normalizeBoards(await repo.loadBoards());
        let boards = normalized.boards;
        let rootBoard = normalized.root ?? undefined;
        // Lưu lại board vừa sửa parentId/tên để lần sau không phải sửa nữa.
        await Promise.all(normalized.changed.map((b) => repo.saveBoard(b)));

        if (!rootBoard) {
          rootBoard = makeDefaultBoard();
          await repo.saveBoard(rootBoard);
          boards = [rootBoard];
        }

        // Object bản cũ trên Home lưu boardId null → đổi sang id thật của Home.
        const migrated = migrateRootObjects(await repo.loadLegacyRootObjects(), rootBoard.id);
        await Promise.all(migrated.map((o) => repo.saveObject(o)));

        if (cancelled) return;
        useBoardsStore.getState().hydrate(boards);
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
    };
  }, []);

  return { state };
}
