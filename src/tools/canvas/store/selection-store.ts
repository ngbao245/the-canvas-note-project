import { create } from 'zustand';
import { useRemoteLockStore } from './remote-lock-store';

interface SelectionState {
  selectedIds: Set<string>;
  select: (id: string) => void;
  toggle: (id: string) => void;
  addToSelection: (ids: string[]) => void;
  replace: (ids: string[]) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
}

// Object đang sửa ở tab khác không vào được vùng chọn (spec canvas-note-autosave US-3):
// chặn 1 chỗ ở đây thay vì ở từng thao tác kéo / màu / xoá / resize.
const selectable = (id: string) => !useRemoteLockStore.getState().ids.has(id);

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedIds: new Set(),
  select: (id) => set({ selectedIds: new Set(selectable(id) ? [id] : []) }),
  toggle: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);
      else if (selectable(id)) next.add(id);
      return { selectedIds: next };
    }),
  addToSelection: (ids) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      for (const id of ids) if (selectable(id)) next.add(id);
      return { selectedIds: next };
    }),
  replace: (ids) => set({ selectedIds: new Set(ids.filter(selectable)) }),
  clear: () => set({ selectedIds: new Set() }),
  isSelected: (id) => get().selectedIds.has(id),
}));

// Tab khác vừa khoá object đang chọn ở tab này → bỏ chọn.
useRemoteLockStore.subscribe(({ ids }) => {
  const cur = useSelectionStore.getState().selectedIds;
  if ([...cur].some((id) => ids.has(id))) {
    useSelectionStore.setState({ selectedIds: new Set([...cur].filter((id) => !ids.has(id))) });
  }
});
