import { create } from 'zustand';

/** Mở / đóng modal phím tắt (toàn app, không persist). Mở từ Trợ giúp hoặc phím `/`. */
interface ShortcutsModalState {
  open: boolean;
  openModal: () => void;
  close: () => void;
}

export const useShortcutsModalStore = create<ShortcutsModalState>()((set) => ({
  open: false,
  openModal: () => set({ open: true }),
  close: () => set({ open: false }),
}));
