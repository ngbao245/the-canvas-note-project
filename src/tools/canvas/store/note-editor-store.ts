import { create } from 'zustand';
import type { Editor } from '@tiptap/react';

/**
 * Bridge Tiptap editor instance từ NoteEditor (deep component trong ObjectsLayer)
 * lên toolbar screen-space overlay (NoteEditingActions trong Toolbar.tsx).
 *
 * Vì sao Zustand thay context: ObjectsLayer và Toolbar là 2 subtree song song
 * dưới CanvasApp, không có ancestor chung gần. Context provider phải wrap cả 2
 * ở CanvasApp, chỉ để pass 1 giá trị đổi khi user vào/ra edit — thà store nhẹ.
 *
 * Rule cứng: mỗi lúc chỉ có 1 note edit → activeEditor là single instance,
 * không map theo id. NoteEditor mount set, cleanup clear. Nếu 2 note cùng edit
 * (không thể xảy ra theo interaction-store editingId single-value) thì latest
 * overwrite — chấp nhận.
 */
export interface NoteEditorState {
  activeEditor: Editor | null;
  setActiveEditor: (editor: Editor | null) => void;
}

export const useNoteEditorStore = create<NoteEditorState>((set) => ({
  activeEditor: null,
  setActiveEditor: (editor) => set({ activeEditor: editor }),
}));
