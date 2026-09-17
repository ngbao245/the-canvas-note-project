import { create } from 'zustand';

interface SelectionState {
  selectedIds: Set<string>;
  select: (id: string) => void;
  toggle: (id: string) => void;
  addToSelection: (ids: string[]) => void;
  replace: (ids: string[]) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedIds: new Set(),

  select: (id) => set({ selectedIds: new Set([id]) }),

  toggle: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),

  addToSelection: (ids) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      for (const id of ids) next.add(id);
      return { selectedIds: next };
    }),

  replace: (ids) => set({ selectedIds: new Set(ids) }),

  clear: () => set({ selectedIds: new Set() }),

  isSelected: (id) => get().selectedIds.has(id),
}));
