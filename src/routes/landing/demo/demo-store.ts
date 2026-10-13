import { create } from 'zustand';
import { makeSampleObjects } from './sample-board';
import type { DemoCamera, DemoDraft, DemoObject } from './types';

// State riêng của canvas mini. Chỉ trong bộ nhớ: không localStorage, không IndexedDB.
// Mảng `objects` giữ thứ tự vẽ (cuối mảng nằm trên cùng).
// Undo lưu nguyên mảng object trước mỗi thay đổi (board mẫu nhỏ, chép cả mảng rẻ hơn
// ghi từng lệnh). Đổi thứ vẽ và camera không tính là 1 bước.

const HISTORY_LIMIT = 50;
const INITIAL_CAMERA: DemoCamera = { x: 0, y: 0, zoom: 1 };

interface DemoState {
  objects: DemoObject[];
  selectedId: string | null;
  editingId: string | null;
  draft: DemoDraft | null;
  sourceOpenId: string | null;
  camera: DemoCamera;
  past: DemoObject[][];
  future: DemoObject[][];

  reset: () => void;
  select: (id: string | null) => void;
  bringToFront: (id: string) => void;
  /** Ghi 1 bước undo với trạng thái hiện tại. Gọi ngay trước khi đổi. */
  record: () => void;
  moveObject: (id: string, x: number, y: number) => void;
  addObject: (obj: DemoObject) => void;
  deleteSelected: () => boolean;
  startEdit: (id: string) => void;
  setDraft: (draft: DemoDraft) => void;
  /** Ghi chữ đang sửa vào object (1 bước undo nếu có đổi) và thoát sửa. */
  finishEdit: () => void;
  openSource: (id: string | null) => void;
  setCamera: (camera: DemoCamera) => void;
  undo: () => boolean;
  redo: () => boolean;
}

export const useDemoStore = create<DemoState>((set, get) => ({
  objects: makeSampleObjects(),
  selectedId: null,
  editingId: null,
  draft: null,
  sourceOpenId: null,
  camera: INITIAL_CAMERA,
  past: [],
  future: [],

  reset: () =>
    set({
      objects: makeSampleObjects(),
      selectedId: null,
      editingId: null,
      draft: null,
      sourceOpenId: null,
      past: [],
      future: [],
    }),

  select: (id) => set({ selectedId: id }),

  bringToFront: (id) =>
    set((s) => {
      const obj = s.objects.find((o) => o.id === id);
      if (!obj || s.objects[s.objects.length - 1] === obj) return s;
      return { objects: [...s.objects.filter((o) => o.id !== id), obj] };
    }),

  record: () =>
    set((s) => ({ past: [...s.past, s.objects].slice(-HISTORY_LIMIT), future: [] })),

  moveObject: (id, x, y) =>
    set((s) => ({ objects: s.objects.map((o) => (o.id === id ? { ...o, x, y } : o)) })),

  addObject: (obj) => {
    get().record();
    set((s) => ({ objects: [...s.objects, obj], selectedId: obj.id }));
  },

  deleteSelected: () => {
    const { selectedId, objects } = get();
    if (!selectedId || !objects.some((o) => o.id === selectedId)) return false;
    get().record();
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== selectedId),
      selectedId: null,
      sourceOpenId: s.sourceOpenId === selectedId ? null : s.sourceOpenId,
    }));
    return true;
  },

  startEdit: (id) => {
    const obj = get().objects.find((o) => o.id === id);
    if (!obj) return;
    get().finishEdit();
    set({ editingId: id, selectedId: id, draft: { title: obj.title, body: obj.body } });
  },

  setDraft: (draft) => set({ draft }),

  finishEdit: () => {
    const { editingId, draft, objects } = get();
    if (!editingId) return;
    const obj = objects.find((o) => o.id === editingId);
    const changed = obj && draft && (obj.title !== draft.title || obj.body !== draft.body);
    if (changed) {
      get().record();
      set((s) => ({
        objects: s.objects.map((o) => (o.id === editingId ? { ...o, ...draft } : o)),
      }));
    }
    set({ editingId: null, draft: null });
  },

  openSource: (id) => set({ sourceOpenId: id }),

  setCamera: (camera) => set({ camera }),

  undo: () => {
    const { past } = get();
    const prev = past[past.length - 1];
    if (!prev) return false;
    set((s) => ({
      objects: prev,
      past: s.past.slice(0, -1),
      future: [s.objects, ...s.future],
      ...afterHistoryJump(s, prev),
    }));
    return true;
  },

  redo: () => {
    const next = get().future[0];
    if (!next) return false;
    set((s) => ({
      objects: next,
      past: [...s.past, s.objects],
      future: s.future.slice(1),
      ...afterHistoryJump(s, next),
    }));
    return true;
  },
}));

/** Sau undo / redo: thoát sửa, bỏ chọn / đóng nguồn nếu object đó không còn. */
function afterHistoryJump(
  s: DemoState,
  objects: DemoObject[],
): Pick<DemoState, 'editingId' | 'draft' | 'selectedId' | 'sourceOpenId'> {
  const has = (id: string | null) => id !== null && objects.some((o) => o.id === id);
  return {
    editingId: null,
    draft: null,
    selectedId: has(s.selectedId) ? s.selectedId : null,
    sourceOpenId: has(s.sourceOpenId) ? s.sourceOpenId : null,
  };
}
