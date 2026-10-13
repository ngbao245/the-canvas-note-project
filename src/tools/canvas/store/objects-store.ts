import { create } from 'zustand';
import type { CanvasObject, Geometry } from '../types';

interface ObjectsState {
  objects: Map<string, CanvasObject>;
  /** Board đã nạp xong vào `objects`. Khác board đang mở = đang tải (vừa vào board / F5). */
  loadedBoardId: string | null;
  hydrate: (list: CanvasObject[], boardId: string) => void;
  add: (obj: CanvasObject) => void;
  updateGeometry: (id: string, geometry: Partial<Geometry>) => void;
  updateData: (id: string, data: unknown) => void;
  /** Chuyển object sang board khác. Dùng cho drop-onto-tile cross-board. */
  updateBoardId: (id: string, boardId: string) => void;
  remove: (id: string) => void;
  removeMany: (ids: string[]) => void;
  get: (id: string) => CanvasObject | undefined;
}

export const useObjectsStore = create<ObjectsState>((set, get) => ({
  objects: new Map(),
  loadedBoardId: null,

  hydrate: (list, boardId) => {
    const map = new Map<string, CanvasObject>();
    for (const o of list) map.set(o.id, o);
    set({ objects: map, loadedBoardId: boardId });
  },

  add: (obj) =>
    set((s) => {
      const map = new Map(s.objects);
      map.set(obj.id, obj);
      return { objects: map };
    }),

  updateGeometry: (id, geometry) =>
    set((s) => {
      const cur = s.objects.get(id);
      if (!cur) return s;
      const map = new Map(s.objects);
      map.set(id, {
        ...cur,
        geometry: { ...cur.geometry, ...geometry },
        updatedAt: new Date().toISOString(),
      });
      return { objects: map };
    }),

  updateData: (id, data) =>
    set((s) => {
      const cur = s.objects.get(id);
      if (!cur) return s;
      const map = new Map(s.objects);
      map.set(id, { ...cur, data, updatedAt: new Date().toISOString() });
      return { objects: map };
    }),

  updateBoardId: (id, boardId) =>
    set((s) => {
      const cur = s.objects.get(id);
      if (!cur) return s;
      const map = new Map(s.objects);
      map.set(id, { ...cur, boardId, updatedAt: new Date().toISOString() });
      return { objects: map };
    }),

  remove: (id) =>
    set((s) => {
      const map = new Map(s.objects);
      map.delete(id);
      return { objects: map };
    }),

  removeMany: (ids) =>
    set((s) => {
      const map = new Map(s.objects);
      for (const id of ids) map.delete(id);
      return { objects: map };
    }),

  get: (id) => get().objects.get(id),
}));
