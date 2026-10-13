import { create } from 'zustand';

/**
 * Object đang được sửa ở tab khác (khoá Web Locks do tab khác giữ). Cập nhật bởi
 * `lib/edit-locks.ts`. Object trong danh sách này không chọn được → không kéo,
 * resize, đổi màu, xoá được (mọi thao tác đó đi qua vùng chọn).
 */
export const useRemoteLockStore = create<{ ids: ReadonlySet<string> }>(() => ({
  ids: new Set<string>(),
}));

export function isLockedElsewhere(id: string): boolean {
  return useRemoteLockStore.getState().ids.has(id);
}
