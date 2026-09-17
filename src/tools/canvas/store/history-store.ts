import { create } from 'zustand';

/**
 * Command đại diện 1 mutation undo-able.
 *   redo(): re-apply (dùng khi Ctrl+Shift+Z)
 *   undo(): reverse (dùng khi Ctrl+Z)
 *
 * Pattern: caller thực hiện action trực tiếp (store + repo), rồi push(cmd) — history
 * KHÔNG tự execute lần đầu. Chỉ execute khi redo. Đơn giản, tránh double-apply.
 */
export interface Command {
  redo: () => void;
  undo: () => void;
  label: string;
}

interface HistoryState {
  undoStack: Command[];
  redoStack: Command[];
  push: (cmd: Command) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

const MAX_STACK = 100; // spec yêu cầu tối thiểu 50

export const useHistoryStore = create<HistoryState>((set) => ({
  undoStack: [],
  redoStack: [],

  push: (cmd) =>
    set((s) => {
      const undo = [...s.undoStack, cmd];
      if (undo.length > MAX_STACK) undo.shift();
      return { undoStack: undo, redoStack: [] };
    }),

  undo: () =>
    set((s) => {
      const stack = s.undoStack;
      if (stack.length === 0) return s;
      const cmd = stack[stack.length - 1];
      cmd.undo();
      return {
        undoStack: stack.slice(0, -1),
        redoStack: [...s.redoStack, cmd],
      };
    }),

  redo: () =>
    set((s) => {
      const stack = s.redoStack;
      if (stack.length === 0) return s;
      const cmd = stack[stack.length - 1];
      cmd.redo();
      return {
        redoStack: stack.slice(0, -1),
        undoStack: [...s.undoStack, cmd],
      };
    }),

  clear: () => set({ undoStack: [], redoStack: [] }),
}));
