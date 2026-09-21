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
  /** Object.id của BoardObject đang bị hover khi drag object khác qua nó (drop-onto-tile).
   *  BoardObject subscribe để render ring highlight + count preview +1. */
  hoveredBoardTileId: string | null;
  /** True khi drag object đang hover trên UnsortToggle (panel đóng) hoặc UnsortPanel (panel mở).
   *  Drop → moveToUnsortHere đưa object vào Unsort cùng board. */
  hoveredUnsortDropTarget: boolean;
  setMode: (mode: InteractionMode) => void;
  setMarqueeRect: (rect: InteractionState['marqueeRect']) => void;
  setResizeHandle: (h: ResizeHandle | null) => void;
  setEditingId: (id: string | null) => void;
  setHoveredBoardTileId: (id: string | null) => void;
  setHoveredUnsortDropTarget: (hover: boolean) => void;
  reset: () => void;
}

export const useInteractionStore = create<InteractionState>((set) => ({
  mode: 'idle',
  marqueeRect: null,
  resizeHandle: null,
  editingId: null,
  hoveredBoardTileId: null,
  hoveredUnsortDropTarget: false,

  setMode: (mode) => set({ mode }),
  setMarqueeRect: (marqueeRect) => set({ marqueeRect }),
  setResizeHandle: (resizeHandle) => set({ resizeHandle }),
  setEditingId: (editingId) => set({ editingId }),
  setHoveredBoardTileId: (hoveredBoardTileId) => set({ hoveredBoardTileId }),
  setHoveredUnsortDropTarget: (hoveredUnsortDropTarget) =>
    set({ hoveredUnsortDropTarget }),

  reset: () =>
    set({
      mode: 'idle',
      marqueeRect: null,
      resizeHandle: null,
      editingId: null,
      hoveredBoardTileId: null,
      hoveredUnsortDropTarget: false,
    }),
}));
