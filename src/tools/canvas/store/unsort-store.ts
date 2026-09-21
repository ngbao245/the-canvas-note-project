import { create } from 'zustand';

/**
 * State cục bộ của Unsort panel.
 *
 *   panelOpen: panel có đang hiển thị không (grid canvas thu hẹp khi true).
 *   drag: state khi user drag item trong Unsort (reorder hoặc drag-out).
 *     sourceIndex — index của item đang được drag.
 *     targetIndex — index dự đoán khi thả trong list (cho preview shift).
 *     outsidePanel — cursor đã rời khỏi panel bounds chưa (chuyển sang chế độ
 *       drag-out ra canvas).
 *     clientX/Y — vị trí cursor hiện tại (cho floating preview khi outsidePanel).
 */
interface UnsortDragState {
  sourceIndex: number;
  targetIndex: number;
  outsidePanel: boolean;
  clientX: number;
  clientY: number;
  /** Cursor offset khi bắt đầu drag (relative to source item bounding rect).
   *  Dùng để position preview sao cho điểm user nắm luôn ở dưới cursor,
   *  không bị lệch qua center hoặc góc. */
  grabOffsetX: number;
  grabOffsetY: number;
  /** Source item size lúc down. Preview có thể có size khác (canvas zoom),
   *  scale offset theo previewSize / sourceSize để giữ tỷ lệ vị trí. */
  sourceWidth: number;
  sourceHeight: number;
}

interface UnsortState {
  panelOpen: boolean;
  drag: UnsortDragState | null;
  /** Anchor cho Shift+click range. Là index của lần click "primary" gần nhất
   *  (click thường hoặc Ctrl+click). Shift+click sẽ chọn range từ anchor tới
   *  item được shift click. null = chưa có anchor. */
  lastSelectedIndex: number | null;
  /** Panel nào đang là active target cho keyboard shortcut (Ctrl+A). Set
   *  'unsort' khi user click vào panel; null khi click ra ngoài. */
  activePanel: 'unsort' | null;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setDrag: (drag: UnsortDragState | null) => void;
  setLastSelectedIndex: (index: number | null) => void;
  setActivePanel: (panel: 'unsort' | null) => void;
}

export const useUnsortStore = create<UnsortState>((set, get) => ({
  panelOpen: false,
  drag: null,
  lastSelectedIndex: null,
  activePanel: null,
  setOpen: (open) =>
    set({ panelOpen: open, activePanel: open ? 'unsort' : null }),
  toggle: () => {
    const next = !get().panelOpen;
    set({ panelOpen: next, activePanel: next ? 'unsort' : null });
  },
  setDrag: (drag) => set({ drag }),
  setLastSelectedIndex: (index) => set({ lastSelectedIndex: index }),
  setActivePanel: (panel) => set({ activePanel: panel }),
}));
