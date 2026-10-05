import { create } from 'zustand';

/**
 * Board id user đang xem, luôn là id thật (Home cũng vậy). null = bootstrap chưa xong.
 * Route.tsx sync từ useParams → store. Consumer khác đọc store thay vì URL trực tiếp
 * để tránh coupling với react-router (VD actions.ts cần biết current view khi
 * undo cross-board move).
 */
interface CurrentBoardState {
  currentBoardId: string | null;
  set: (id: string | null) => void;
}

export const useCurrentBoardStore = create<CurrentBoardState>((set) => ({
  currentBoardId: null,
  set: (currentBoardId) => set({ currentBoardId }),
}));
