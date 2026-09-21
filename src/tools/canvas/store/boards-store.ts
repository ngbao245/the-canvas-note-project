import { create } from 'zustand';
import type { Board } from '../types';

/**
 * Board entity store reactive. Bootstrap hydrate 1 lần từ IDB, sau đó mutation
 * đi qua actions (createBoardAt, renameBoard, deleteBoardCascade). Breadcrumb
 * và BoardObject subscribe để render name/color/count.
 */
interface BoardsState {
  boards: Map<string, Board>;
  hydrate: (list: Board[]) => void;
  add: (board: Board) => void;
  update: (id: string, patch: Partial<Board>) => void;
  remove: (id: string) => void;
  removeMany: (ids: string[]) => void;
  get: (id: string) => Board | undefined;
}

export const useBoardsStore = create<BoardsState>((set, get) => ({
  boards: new Map(),

  hydrate: (list) => {
    const map = new Map<string, Board>();
    for (const b of list) map.set(b.id, b);
    set({ boards: map });
  },

  add: (board) =>
    set((s) => {
      const map = new Map(s.boards);
      map.set(board.id, board);
      return { boards: map };
    }),

  update: (id, patch) =>
    set((s) => {
      const cur = s.boards.get(id);
      if (!cur) return s;
      const map = new Map(s.boards);
      map.set(id, { ...cur, ...patch, updatedAt: new Date().toISOString() });
      return { boards: map };
    }),

  remove: (id) =>
    set((s) => {
      const map = new Map(s.boards);
      map.delete(id);
      return { boards: map };
    }),

  removeMany: (ids) =>
    set((s) => {
      const map = new Map(s.boards);
      for (const id of ids) map.delete(id);
      return { boards: map };
    }),

  get: (id) => get().boards.get(id),
}));
