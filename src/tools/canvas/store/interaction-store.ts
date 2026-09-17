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
  setMode: (mode: InteractionMode) => void;
  setMarqueeRect: (rect: InteractionState['marqueeRect']) => void;
  setResizeHandle: (h: ResizeHandle | null) => void;
  reset: () => void;
}

export const useInteractionStore = create<InteractionState>((set) => ({
  mode: 'idle',
  marqueeRect: null,
  resizeHandle: null,

  setMode: (mode) => set({ mode }),
  setMarqueeRect: (marqueeRect) => set({ marqueeRect }),
  setResizeHandle: (resizeHandle) => set({ resizeHandle }),

  reset: () => set({ mode: 'idle', marqueeRect: null, resizeHandle: null }),
}));
