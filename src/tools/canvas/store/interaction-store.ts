import { create } from 'zustand';

/**
 * Interaction mode: engine chỉ ở 1 mode tại 1 thời điểm.
 * - idle: bình thường, hover/click
 * - panning: đang pan camera
 * - dragging: đang kéo object đã select
 * - resizing: đang kéo resize handle
 * - marquee: đang kéo rectangle chọn nhiều object
 */
export type InteractionMode = 'idle' | 'panning' | 'dragging' | 'resizing' | 'marquee';

/** Handle nào đang được kéo trong mode='resizing'. */
export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

interface InteractionState {
  mode: InteractionMode;
  /** Marquee rectangle trong screen space, chỉ set khi mode='marquee'. */
  marqueeRect: { x: number; y: number; width: number; height: number } | null;
  /** Handle đang kéo khi mode='resizing'. */
  resizeHandle: ResizeHandle | null;
  /** Object đang được edit inline. Chỉ 1 object edit tại 1 thời điểm. */
  editingId: string | null;
  /** Screen coord (clientX/Y) của event trigger edit. Renderer dùng để đặt
   *  cursor tại vị trí click (Milanote parity — click hàng nào, caret hàng đó,
   *  không phải nhảy về cuối doc). Null khi edit trigger từ nguồn khác (VD
   *  keyboard shortcut) → renderer fallback focus end. */
  editingClickPoint: { x: number; y: number } | null;
  /** Object.id của BoardObject đang bị hover khi drag object khác qua nó (drop-onto-tile).
   *  BoardObject subscribe để render ring highlight + count preview +1. */
  hoveredBoardTileId: string | null;
  /** True khi drag object đang hover trên UnsortToggle (panel đóng) hoặc UnsortPanel (panel mở).
   *  Drop → moveToUnsortHere đưa object vào Unsort cùng board. */
  hoveredUnsortDropTarget: boolean;
  /** Số lần Ctrl+V liên tiếp sau lần Ctrl+C/X gần nhất. Ctrl+V lần thứ N paste
   *  tại anchor (từ ClipboardPayload) + N * PASTE_OFFSET_STEP → thẻ cascade
   *  diagonal, không đè lên nhau và không đè lên object gốc. Reset về 0 mỗi
   *  Ctrl+C/X (clipboard mới). Milanote parity. */
  pasteCounter: number;
  setMode: (mode: InteractionMode) => void;
  setMarqueeRect: (rect: InteractionState['marqueeRect']) => void;
  setResizeHandle: (h: ResizeHandle | null) => void;
  setEditingId: (id: string | null, clickPoint?: { x: number; y: number } | null) => void;
  setHoveredBoardTileId: (id: string | null) => void;
  setHoveredUnsortDropTarget: (hover: boolean) => void;
  setPasteCounter: (n: number) => void;
  reset: () => void;
}

export const useInteractionStore = create<InteractionState>((set) => ({
  mode: 'idle',
  marqueeRect: null,
  resizeHandle: null,
  editingId: null,
  editingClickPoint: null,
  hoveredBoardTileId: null,
  hoveredUnsortDropTarget: false,
  pasteCounter: 0,

  setMode: (mode) => set({ mode }),
  setMarqueeRect: (marqueeRect) => set({ marqueeRect }),
  setResizeHandle: (resizeHandle) => set({ resizeHandle }),
  setEditingId: (editingId, clickPoint) =>
    set({ editingId, editingClickPoint: clickPoint ?? null }),
  setHoveredBoardTileId: (hoveredBoardTileId) => set({ hoveredBoardTileId }),
  setHoveredUnsortDropTarget: (hoveredUnsortDropTarget) =>
    set({ hoveredUnsortDropTarget }),
  setPasteCounter: (pasteCounter) => set({ pasteCounter }),

  reset: () =>
    set({
      mode: 'idle',
      marqueeRect: null,
      resizeHandle: null,
      editingId: null,
      editingClickPoint: null,
      hoveredBoardTileId: null,
      hoveredUnsortDropTarget: false,
      pasteCounter: 0,
    }),
}));
