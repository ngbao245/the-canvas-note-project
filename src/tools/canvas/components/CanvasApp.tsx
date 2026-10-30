import { useState, useEffect, useRef } from 'react';
import { CanvasSurface } from './CanvasSurface';
import { UnsortPanel } from './UnsortPanel';
import { ConfirmDialog } from './ConfirmDialog';
import { useObjectsStore } from '../store/objects-store';
import { useBoardsStore } from '../store/boards-store';
import { useUnsortStore } from '../store/unsort-store';
import { useSelectionStore } from '../store/selection-store';
import {
  deleteObjects,
  deleteBoardCascade,
  countBoardTreeSize,
  deleteSelectionWithBoards,
  moveToUnsortHere,
} from '../engine/actions';
import { boardDataSchema } from '../types';
import { CANVAS_SHORTCUT_DEFS } from '../shortcuts';
import {
  bindShortcuts,
  shortcutKeys,
  useKeyboardPlatform,
  useShortcutLayer,
} from '@/lib/shortcuts';
import { scaledFillStyle } from '../lib/scaled-box';
import { useI18n } from '@/lib/i18n';
import { useInterfaceScale } from '@/stores/interface-store';
import { useHeaderStyle } from '@/stores/canvas-settings-store';
import { islandsTopInset } from '../lib/header-islands';

/** Bề rộng panel Unsort ở mức Lớn (tỉ lệ 1). */
const UNSORT_PANEL_WIDTH = 260;

type PendingKind =
  | { kind: 'multi'; ids: string[] }
  | {
      // Vùng chọn có board tile cùng object khác, hoặc nhiều board tile.
      kind: 'mixed';
      ids: string[];
      boardIds: string[];
      otherCount: number;
      count: { boards: number; objects: number } | null;
    }
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
  const uiScale = useInterfaceScale();
  const islands = useHeaderStyle() === 'islands';
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  // React 18 chưa biết thuộc tính `inert` → gắn thẳng lên DOM.
  useEffect(() => {
    panelRef.current?.toggleAttribute('inert', !unsortOpen);
  }, [unsortOpen]);
  // Tổ hợp Undo chèn vào câu "Undo được (...)" của dialog xoá, lấy từ bảng phím.
  // Tính trong component để đổi Kiểu bàn phím là câu đổi theo.
  const platform = useKeyboardPlatform();
  const undoKeys = shortcutKeys(CANVAS_SHORTCUT_DEFS['canvas.undo'], platform);

  const handleDelete = (ids: string[]) => {
    const objects = useObjectsStore.getState().objects;
    // Board tile hợp lệ trong vùng chọn → id board con của nó.
    const tiles: Array<{ objectId: string; boardId: string }> = [];
    for (const id of ids) {
      const o = objects.get(id);
      if (o?.type !== 'board') continue;
      const parsed = boardDataSchema.safeParse(o.data);
      if (parsed.success) tiles.push({ objectId: id, boardId: parsed.data.linkedBoardId });
    }
    if (tiles.length === 1 && ids.length === 1) {
      const board = useBoardsStore.getState().boards.get(tiles[0].boardId);
      setPending({
        kind: 'board',
        objectId: tiles[0].objectId,
        boardId: tiles[0].boardId,
        boardName: board?.name ?? 'Board',
        count: null,
      });
      return;
    }
    if (tiles.length > 0) {
      setPending({
        kind: 'mixed',
        ids,
        boardIds: tiles.map((x) => x.boardId),
        otherCount: ids.length - tiles.length,
        count: null,
      });
      return;
    }
    if (ids.length > 1) setPending({ kind: 'multi', ids });
    else deleteObjects(ids);
  };

  // Phím của CanvasApp (tổ hợp + nhãn ở ../shortcuts.ts).
  useShortcutLayer(
    'tool',
    bindShortcuts(CANVAS_SHORTCUT_DEFS, {
      // Route quyết show confirm dialog (board / nhiều object) hay xoá thẳng.
      'canvas.delete': {
        run: () => {
          const ids = Array.from(useSelectionStore.getState().selectedIds);
          if (ids.length === 0) return false;
          handleDelete(ids);
        },
      },
      // Chuyển selection từ canvas vào Unsort board hiện tại. Bỏ item đã ở Unsort.
      'canvas.to-unsort': {
        run: () => {
          const store = useObjectsStore.getState();
          const canvasIds = Array.from(useSelectionStore.getState().selectedIds).filter((id) => {
            const o = store.objects.get(id);
            return o && o.unsortIndex === null;
          });
          if (canvasIds.length === 0) return false;
          moveToUnsortHere(canvasIds);
        },
      },
    }),
  );

  // Lớp panel nằm trên tool: Unsort mở → Esc chỉ đóng panel, lần sau mới bỏ chọn.
  useShortcutLayer(
    'panel',
    bindShortcuts(CANVAS_SHORTCUT_DEFS, {
      'unsort.close': {
        when: () => useUnsortStore.getState().panelOpen,
        run: () => {
          useUnsortStore.getState().setOpen(false);
        },
      },
    }),
  );

  useEffect(() => {
    if (!pending || pending.kind === 'multi' || pending.count !== null) return;
    let cancelled = false;
    (async () => {
      if (pending.kind === 'board') {
        const size = await countBoardTreeSize(pending.boardId);
        if (cancelled) return;
        setPending((p) =>
          p && p.kind === 'board' && p.boardId === pending.boardId ? { ...p, count: size } : p,
        );
        return;
      }
      // Lẫn board: mỗi tile tính là 1 board + cây con của nó; object = object khác + nội dung các cây.
      let boards = 0;
      let objects = pending.otherCount;
      for (const bid of pending.boardIds) {
        const size = await countBoardTreeSize(bid);
        boards += 1 + size.boards;
        objects += size.objects;
      }
      if (cancelled) return;
      setPending((p) => (p === pending ? { ...p, count: { boards, objects } } : p));
    })();
    return () => {
      cancelled = true;
    };
  }, [pending]);

  // Dialog tan dần sau khi đóng → giữ nội dung lần cuối cho tới khi gỡ hẳn.
  const lastPendingRef = useRef(pending);
  if (pending) lastPendingRef.current = pending;
  const shownPending = pending ?? lastPendingRef.current;

  // Nội dung dialog theo loại xoá. Xác nhận xong đóng dialog (dialog tự tan).
  const confirmContent = (p: PendingKind) => {
    const confirm = (run: () => void) => () => {
      run();
      setPending(null);
    };
    if (p.kind === 'multi') {
      return {
        title: t('CANVAS.CONFIRM.DELETE_MANY.TITLE'),
        description: t('CANVAS.CONFIRM.DELETE_MANY.DESCRIPTION', {
          items: t('CANVAS.COUNT.OBJECT', { count: p.ids.length }),
          undo: undoKeys,
        }),
        confirmLabel: t('COMMON.DELETE'),
        onConfirm: confirm(() => deleteObjects(p.ids)),
      };
    }
    if (p.kind === 'mixed') {
      return {
        title: t('CANVAS.CONFIRM.DELETE_MANY.TITLE'),
        description:
          p.count === null
            ? t('CANVAS.CONFIRM.DELETE_BOARD.COUNTING')
            : t('CANVAS.CONFIRM.DELETE_MANY.DESCRIPTION', {
                items: deleteBoardItems(t, p.count),
                undo: undoKeys,
              }),
        confirmLabel: t('COMMON.DELETE'),
        onConfirm: confirm(() => void deleteSelectionWithBoards(p.ids)),
      };
    }
    return {
      title: t('CANVAS.CONFIRM.DELETE_BOARD.TITLE', { name: p.boardName }),
      description:
        p.count === null
          ? t('CANVAS.CONFIRM.DELETE_BOARD.COUNTING')
          : p.count.objects === 0 && p.count.boards === 0
            ? t('CANVAS.CONFIRM.DELETE_BOARD.EMPTY', { undo: undoKeys })
            : t('CANVAS.CONFIRM.DELETE_BOARD.DESCRIPTION', {
                items: deleteBoardItems(t, p.count),
                undo: undoKeys,
              }),
      confirmLabel: t('CANVAS.CONFIRM.DELETE_BOARD.CONFIRM'),
      onConfirm: confirm(() => void deleteBoardCascade(p.objectId)),
    };
  };

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
      {/*
       * Kích thước giao diện: khung ngoài rộng 260 × tỉ lệ (chiếm đúng chỗ trên màn hình), panel bên
       * trong vẫn layout ở 260px rồi scale xuống. Chiều cao chia tỉ lệ để sau khi scale vẫn cao bằng canvas.
       */}
      {/* Header đảo nổi: panel bắt đầu dưới hàng đảo (không đè đảo phải), sát đáy như cũ. */}
      {/* Trượt bằng motion `panel` (mở chậm dần, đóng tăng tốc, quay đầu được giữa
          chừng). Đóng: inert → không nhận Tab / focus, phần tử trong panel không bấm được. */}
      <div
        ref={panelRef}
        data-motion="panel"
        data-side="right"
        data-state={unsortOpen ? 'open' : 'closed'}
        className="absolute bottom-0 right-0 z-toolbar"
        style={{
          width: UNSORT_PANEL_WIDTH * uiScale,
          top: islands ? islandsTopInset(uiScale) : 0,
        }}
      >
        <div style={{ width: UNSORT_PANEL_WIDTH, ...scaledFillStyle(uiScale) }}>
          <UnsortPanel boardId={boardId} />
        </div>
      </div>

      {shownPending ? (
        <ConfirmDialog
          open={pending !== null}
          {...confirmContent(shownPending)}
          destructive
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
