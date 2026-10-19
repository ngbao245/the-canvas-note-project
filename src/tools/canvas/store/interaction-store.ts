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
  /** Chiều cao chữ của object đang sửa (canvas-px), chỉ để VẼ: note fixed lúc
   *  sửa dài ra cho thấy hết chữ, thoát sửa về đúng cao đã lưu. Không ghi
   *  geometry, không vào undo. Đổi editingId thì tự về null. */
  editingHeight: number | null;
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
  /** Ghi chiều cao tạm cho `id`. Bỏ qua nếu `id` không còn là object đang sửa
   *  (editor cũ gỡ trễ không đè lên note mới). */
  setEditingHeight: (id: string, height: number | null) => void;
  setHoveredBoardTileId: (id: string | null) => void;
  setHoveredUnsortDropTarget: (hover: boolean) => void;
  setPasteCounter: (n: number) => void;
  reset: () => void;
}

/**
 * Chiều cao đang hiện của object: lúc sửa có chiều cao tạm lớn hơn thì lấy
 * chiều cao tạm, còn lại lấy chiều cao đã lưu. Dùng chung cho lớp vẽ và góc
 * resize để kéo góc bắt đầu từ đúng khung đang thấy.
 */
export function shownHeight(
  s: Pick<InteractionState, 'editingId' | 'editingHeight'>,
  id: string,
  storedHeight: number,
): number {
  if (s.editingId !== id || s.editingHeight === null) return storedHeight;
  return Math.max(storedHeight, s.editingHeight);
}

export const useInteractionStore = create<InteractionState>((set) => ({
  mode: 'idle',
  marqueeRect: null,
  resizeHandle: null,
  editingId: null,
  editingClickPoint: null,
  editingHeight: null,
  hoveredBoardTileId: null,
  hoveredUnsortDropTarget: false,
  pasteCounter: 0,

  setMode: (mode) => set({ mode }),
  setMarqueeRect: (marqueeRect) => set({ marqueeRect }),
  setResizeHandle: (resizeHandle) => set({ resizeHandle }),
  // Đổi object đang sửa → bỏ chiều cao tạm của object cũ.
  setEditingId: (editingId, clickPoint) =>
    set({ editingId, editingClickPoint: clickPoint ?? null, editingHeight: null }),
  setEditingHeight: (id, height) =>
    set((s) => (s.editingId === id && s.editingHeight !== height ? { editingHeight: height } : s)),
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
      editingHeight: null,
      hoveredBoardTileId: null,
      hoveredUnsortDropTarget: false,
      pasteCounter: 0,
    }),
}));
