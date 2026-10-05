import { useState, useCallback, useEffect } from 'react';
import { CanvasSurface } from './CanvasSurface';
import { UnsortPanel } from './UnsortPanel';
import { ConfirmDialog } from './ConfirmDialog';
import { useDeleteKey } from '../hooks/useDeleteKey';
import { useObjectsStore } from '../store/objects-store';
import { useBoardsStore } from '../store/boards-store';
import { useUnsortStore } from '../store/unsort-store';
import { useSelectionStore } from '../store/selection-store';
import {
  deleteObjects,
  deleteBoardCascade,
  countBoardTreeSize,
  moveToUnsortHere,
} from '../engine/actions';
import { boardDataSchema } from '../types';
import { isEditableTarget } from '../lib/dom';
import { useI18n } from '@/lib/i18n';

type PendingKind =
  | { kind: 'multi'; ids: string[] }
  | {
      kind: 'board';
      objectId: string;
      boardId: string;
      boardName: string;
      count: { boards: number; objects: number } | null;
    };

/**
 * CanvasApp — CanvasSurface full width (flex-1), UnsortPanel là overlay absolute
 * bên phải (w-260, translateX slide in/out). Overlay không grid vì cột grid sẽ
 * clip item khi drag ra panel — overlay để item cầm lên có thể phủ tự nhiên trên
 * panel (Milanote parity). Panel luôn mount, chỉ đổi transform → không state loss.
 */
export function CanvasApp({ boardId }: { boardId: string }) {
  const [pending, setPending] = useState<PendingKind | null>(null);
  const unsortOpen = useUnsortStore((s) => s.panelOpen);
  const { t } = useI18n();

  const handleDelete = useCallback((ids: string[]) => {
    const objects = useObjectsStore.getState().objects;
    const boardObj = ids.map((id) => objects.get(id)).find((o) => o?.type === 'board');
    if (boardObj) {
      const parsed = boardDataSchema.safeParse(boardObj.data);
      if (parsed.success) {
        const linkedBoardId = parsed.data.linkedBoardId;
        const board = useBoardsStore.getState().boards.get(linkedBoardId);
        setPending({
          kind: 'board',
          objectId: boardObj.id,
          boardId: linkedBoardId,
          boardName: board?.name ?? 'Board',
          count: null,
        });
        return;
      }
    }
    if (ids.length > 1) setPending({ kind: 'multi', ids });
    else deleteObjects(ids);
  }, []);

  useDeleteKey(handleDelete);

  // Ctrl+Shift+U → move selection từ canvas vào Unsort của board hiện tại.
  // Chỉ áp dụng cho object có unsortIndex === null (đang ở canvas).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || !e.shiftKey) return;
      if (e.key !== 'u' && e.key !== 'U') return;
      const ids = Array.from(useSelectionStore.getState().selectedIds);
      if (ids.length === 0) return;
      const store = useObjectsStore.getState();
      const canvasIds = ids.filter((id) => {
        const o = store.objects.get(id);
        return o && o.unsortIndex === null;
      });
      if (canvasIds.length === 0) return;
      e.preventDefault();
      moveToUnsortHere(canvasIds);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!pending || pending.kind !== 'board' || pending.count !== null) return;
    let cancelled = false;
    (async () => {
      const size = await countBoardTreeSize(pending.boardId);
      if (cancelled) return;
      setPending((p) =>
        p && p.kind === 'board' && p.boardId === pending.boardId ? { ...p, count: size } : p,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [pending]);

  // Escape đóng Unsort panel khi đang mở.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useUnsortStore.getState().panelOpen) {
        useUnsortStore.getState().setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col">
        <CanvasSurface boardId={boardId} />
      </div>
      {/*
       * UnsortPanel: overlay absolute bên phải (không grid) để item drag trong
       * canvas có thể "bay lên trên" panel (screen-space visual đúng Milanote).
       * Slide in/out qua translateX. z-toolbar để panel nổi trên canvas surface
       * nhưng dưới drag-layer (item đang kéo).
       */}
      <div
        className={`absolute right-0 top-0 h-full w-[260px] z-toolbar transition-transform duration-normal ease-standard ${
          unsortOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <UnsortPanel boardId={boardId} />
      </div>

      {pending?.kind === 'multi' ? (
        <ConfirmDialog
          open
          title={t('CANVAS.CONFIRM.DELETE_MANY.TITLE')}
          description={t('CANVAS.CONFIRM.DELETE_MANY.DESCRIPTION', {
            items: t('CANVAS.COUNT.OBJECT', { count: pending.ids.length }),
          })}
          confirmLabel={t('COMMON.DELETE')}
          destructive
          onConfirm={() => {
            deleteObjects(pending.ids);
            setPending(null);
          }}
          onCancel={() => setPending(null)}
        />
      ) : null}
      {pending?.kind === 'board' ? (
        <ConfirmDialog
          open
          title={t('CANVAS.CONFIRM.DELETE_BOARD.TITLE', { name: pending.boardName })}
          description={
            pending.count === null
              ? t('CANVAS.CONFIRM.DELETE_BOARD.COUNTING')
              : pending.count.objects === 0 && pending.count.boards === 0
                ? t('CANVAS.CONFIRM.DELETE_BOARD.EMPTY')
                : t('CANVAS.CONFIRM.DELETE_BOARD.DESCRIPTION', {
                    items: deleteBoardItems(t, pending.count),
                  })
          }
          confirmLabel={t('CANVAS.CONFIRM.DELETE_BOARD.CONFIRM')}
          destructive
          onConfirm={() => {
            void deleteBoardCascade(pending.objectId);
            setPending(null);
          }}
          onCancel={() => setPending(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * "3 objects + 2 sub-boards": mỗi phần có số nhiều riêng nên dịch từng phần rồi ghép bằng key
 * `COMMON.LIST_PLUS`, không cộng chuỗi cứng trong JSX.
 */
function deleteBoardItems(
  t: ReturnType<typeof useI18n>['t'],
  count: { boards: number; objects: number },
): string {
  const objects = t('CANVAS.COUNT.OBJECT', { count: count.objects });
  if (count.boards === 0) return objects;
  return t('COMMON.LIST_PLUS', {
    a: objects,
    b: t('CANVAS.COUNT.SUB_BOARD', { count: count.boards }),
  });
}
