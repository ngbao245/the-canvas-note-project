import { useEffect, useState } from 'react';
import { getCanvasRepository } from '../api';
import { makeDefaultBoard, type Board } from '../types';
import { useBoardsStore } from '../store/boards-store';

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
        // Đọc + tạo Home trong khoá chung giữa tab (và giữa 2 lần chạy của StrictMode):
        // lần chạy sau chờ lần trước xong, thấy Home đã có, không tạo thêm.
        const { boards, rootBoard } = await withBootstrapLock(async () => {
          const loaded = await repo.loadBoards();
          const found = findRoot(loaded);
          if (found) return { boards: loaded, rootBoard: found };
          const created = makeDefaultBoard();
          await repo.saveBoard(created);
          return { boards: [...loaded, created], rootBoard: created };
        });

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

const BOOTSTRAP_LOCK = 'bibo-canvas-bootstrap';

/**
 * Chạy `fn` trong Web Lock độc quyền. Tab đóng giữa chừng thì trình duyệt tự nhả.
 * Không có Web Lock thì chạy thẳng (chấp nhận rủi ro 2 Home, xem design.md).
 */
function withBootstrapLock<T>(fn: () => Promise<T>): Promise<T> {
  if (!navigator.locks) return fn();
  return navigator.locks.request(BOOTSTRAP_LOCK, fn) as Promise<T>;
}

/** Home = board không có cha. Lỡ có nhiều (2 tab cùng tạo) thì lấy cái tạo sớm nhất. */
function findRoot(boards: Board[]): Board | undefined {
  return boards
    .filter((b) => b.parentId === null)
    .reduce<Board | undefined>((a, b) => (!a || b.createdAt < a.createdAt ? b : a), undefined);
}
