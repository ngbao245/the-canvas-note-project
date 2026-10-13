/**
 * Chỗ duy nhất nối tool vào code dùng chung (modal phím tắt, Cài đặt).
 * `src/lib/` và `src/components/` không được import `src/tools/` (luật lint), nên tool
 * đăng ký vào sổ ở `src/lib/` tại đây. Chạy 1 lần khi `App.tsx` import file này.
 *
 * Tool mới: thêm bảng phím (`registerShortcutDefs`) và, nếu có dữ liệu để đếm, hàm đếm.
 */
import { registerShortcutDefs } from '@/lib/shortcuts';
import { registerDataCounter } from '@/lib/data-stats';
import { CANVAS_SHORTCUT_DEFS, NOTE_TEXT_SHORTCUT_DEFS } from '@/tools/canvas/shortcuts';

// Bảng phím chỉ là dữ liệu (không kéo store / UI của canvas vào bundle chính).
registerShortcutDefs(CANVAS_SHORTCUT_DEFS);
registerShortcutDefs(NOTE_TEXT_SHORTCUT_DEFS);

// Tải module canvas lúc cần (mở Cài đặt → Dữ liệu), để bundle chính không chứa code lưu trữ canvas.
registerDataCounter(async () => {
  const { getCanvasRepository } = await import('@/tools/canvas/api');
  return getCanvasRepository().countAll();
});
