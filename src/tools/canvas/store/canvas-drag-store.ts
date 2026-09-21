import { create } from 'zustand';

/**
 * State floating preview cho canvas object drag (thay in-place lift cũ).
 *
 * Unified visualize với toolbar/unsort drag: cả 3 case cùng dùng
 * FloatingObjectPreview portal ra body → item bay trên toolbar/header/panel,
 * không bị bounded overflow-hidden của canvas surface hoặc stacking context
 * của world wrapper.
 *
 * Chỉ track primary object (item được cầm). Các item còn lại trong multi-select
 * bị hide visibility trong world layer, không cần preview riêng — Milanote parity.
 *
 *   primaryId — object.id của item đang được cầm (chỉ 1).
 *   clientX/Y — cursor position hiện tại (screen-space).
 *   grabOffsetX/Y — offset cursor tới top-left preview trong PREVIEW-space
 *     (đã scale theo camera.zoom vì preview size = geometry × zoom).
 *   dim — cursor đang ở vùng khác canvas trống (invalid/trash/board tile/unsort
 *     target) → dim preview 0.5 để feedback.
 */
interface CanvasObjectDragState {
  primaryId: string;
  clientX: number;
  clientY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  dim: boolean;
}

interface CanvasDragStore {
  drag: CanvasObjectDragState | null;
  setDrag: (drag: CanvasObjectDragState | null) => void;
}

export const useCanvasDragStore = create<CanvasDragStore>((set) => ({
  drag: null,
  setDrag: (drag) => set({ drag }),
}));
