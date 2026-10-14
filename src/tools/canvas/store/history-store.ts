import { create } from 'zustand';

/**
 * Command đại diện 1 mutation undo-able.
 *   redo(): re-apply (dùng khi Ctrl+Shift+Z)
 *   undo(): reverse (dùng khi Ctrl+Z)
 *
 * Pattern: caller thực hiện action trực tiếp (store + repo), rồi push(cmd) — history
 * KHÔNG tự execute lần đầu. Chỉ execute khi redo. Đơn giản, tránh double-apply.
 *
 * Lịch sử riêng từng board (bạn chốt 2026-10-13): mỗi board 1 cặp stack undo / redo.
 * Lệnh vào stack của board ĐANG XEM lúc làm, kể cả lệnh đổi dữ liệu board khác (thả vào
 * tile, xoá cây board). Đổi board chỉ chuyển stack đang dùng, không xoá stack nào; quay
 * lại board cũ vẫn undo tiếp được. Stack chỉ nằm trong bộ nhớ, F5 là mất.
 */
export interface Command {
  redo: () => void;
  undo: () => void;
  label: string;
}

interface BoardHistory {
  undo: Command[];
  redo: Command[];
}

interface HistoryState {
  /** Board đang xem; null = chưa vào board nào (bootstrap), push bị bỏ. */
  activeBoardId: string | null;
  /** Stack của board đang xem (bản để UI đọc, đổi theo `activeBoardId`). */
  undoStack: Command[];
  redoStack: Command[];
  /** `boardId`: board đã làm thao tác, khi lệnh push sau `await` (người dùng có thể đã đổi board). */
  push: (cmd: Command, boardId?: string | null) => void;
  undo: () => void;
  redo: () => void;
  /** Đổi board đang xem → chuyển sang stack của board đó. */
  setActiveBoard: (boardId: string | null) => void;
  /** Xoá hết lịch sử mọi board. */
  clear: () => void;
}

export const MAX_STACK = 100; // mỗi board, spec yêu cầu tối thiểu 50

const EMPTY: Command[] = [];

/** Stack theo board. Ngoài store để mỗi lần push không phải chép cả Map. */
const stacks = new Map<string, BoardHistory>();

/** Đang gom: push đi vào đây thay vì vào stack (xem `beginHistoryGroup`). */
let group: { boardId: string | null; cmds: Command[] } | null = null;

/**
 * Đang chạy undo / redo của 1 lệnh: bỏ mọi push. Vài lệnh redo bằng cách gọi lại hàm gốc
 * (VD `moveObjectsToUnsort`), hàm đó tự push lần nữa → nếu nhận sẽ xoá stack redo và
 * nhân đôi bước undo.
 */
let replaying = false;

function replay(fn: () => void): void {
  replaying = true;
  try {
    fn();
  } finally {
    replaying = false;
  }
}

function viewOf(boardId: string | null): Pick<HistoryState, 'undoStack' | 'redoStack'> {
  const h = boardId ? stacks.get(boardId) : undefined;
  return { undoStack: h?.undo ?? EMPTY, redoStack: h?.redo ?? EMPTY };
}

function pushTo(boardId: string, cmd: Command): void {
  const h = stacks.get(boardId) ?? { undo: [], redo: [] };
  const undo = [...h.undo, cmd];
  if (undo.length > MAX_STACK) undo.shift();
  stacks.set(boardId, { undo, redo: [] });
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  activeBoardId: null,
  undoStack: EMPTY,
  redoStack: EMPTY,

  push: (cmd, target) => {
    if (replaying) return;
    if (group) {
      group.cmds.push(cmd);
      return;
    }
    const active = get().activeBoardId;
    const boardId = target === undefined ? active : target;
    if (!boardId) return;
    pushTo(boardId, cmd);
    if (boardId === active) set(viewOf(boardId));
  },

  undo: () => {
    const boardId = get().activeBoardId;
    const h = boardId ? stacks.get(boardId) : undefined;
    if (!boardId || !h || h.undo.length === 0) return;
    const cmd = h.undo[h.undo.length - 1];
    // Đổi stack TRƯỚC khi chạy lệnh: lệnh có thể push (không nên) hay đổi board giữa chừng.
    stacks.set(boardId, { undo: h.undo.slice(0, -1), redo: [...h.redo, cmd] });
    set(viewOf(boardId));
    replay(cmd.undo);
  },

  redo: () => {
    const boardId = get().activeBoardId;
    const h = boardId ? stacks.get(boardId) : undefined;
    if (!boardId || !h || h.redo.length === 0) return;
    const cmd = h.redo[h.redo.length - 1];
    stacks.set(boardId, { undo: [...h.undo, cmd], redo: h.redo.slice(0, -1) });
    set(viewOf(boardId));
    replay(cmd.redo);
  },

  setActiveBoard: (boardId) => {
    if (get().activeBoardId === boardId) return;
    set({ activeBoardId: boardId, ...viewOf(boardId) });
  },

  clear: () => {
    stacks.clear();
    set(viewOf(null));
  },
}));

/**
 * Gom nhiều lệnh thành 1 bước undo (VD xoá vùng chọn có cả board tile lẫn object khác).
 * Mọi `push` giữa begin và end vào nhóm; end đẩy 1 lệnh gộp: undo chạy ngược, redo chạy xuôi.
 * Nhóm vào stack của board đang xem lúc BEGIN (nhóm có thể chờ IndexedDB, người dùng đổi
 * board giữa chừng thì vẫn về đúng board đã làm). Không lồng nhau. Phải gọi end kể cả khi
 * lỗi (try / finally).
 */
export function beginHistoryGroup(): void {
  group = { boardId: useHistoryStore.getState().activeBoardId, cmds: [] };
}

export function endHistoryGroup(label: string): void {
  const g = group;
  group = null;
  if (!g || !g.boardId || g.cmds.length === 0) return;
  const cmds = g.cmds;
  const cmd: Command =
    cmds.length === 1
      ? cmds[0]
      : {
          label,
          undo: () => {
            for (let i = cmds.length - 1; i >= 0; i--) cmds[i].undo();
          },
          redo: () => {
            for (const c of cmds) c.redo();
          },
        };
  pushTo(g.boardId, cmd);
  const s = useHistoryStore.getState();
  if (s.activeBoardId === g.boardId) useHistoryStore.setState(viewOf(g.boardId));
}
