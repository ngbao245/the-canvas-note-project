import type { ShortcutDef } from '@/lib/shortcuts';

/**
 * Phím của canvas mini. Chỉ dữ liệu. Không có `display`: không hiện trong modal phím
 * tắt của app (đó là bảng của canvas thật). Hành động gắn ở useDemoKeys, lớp tool,
 * chỉ bật khi khung demo đang bật.
 */
export const DEMO_SHORTCUT_DEFS = {
  'demo.undo': { combos: [{ mod: true, key: 'z' }] },
  'demo.redo': {
    combos: [
      { mod: true, shift: true, key: 'z' },
      { mod: true, key: 'y' },
    ],
  },
  'demo.delete': {
    combos: [
      { shift: 'any', key: 'Delete' },
      { shift: 'any', key: 'Backspace' },
    ],
  },
  'demo.edit': { combos: [{ key: 'Enter' }] },
  // Delete / Backspace / Enter / Esc chỉ có tác dụng trong khung; ngoài khung lớp này tắt.
  // Lớp tool không chạy khi đang gõ: Esc trong ô sửa do chính ô xử, panel nguồn
  // do lớp overlay xử trước. Tới đây là không còn gì để đóng → nhả khung.
  'demo.release': { combos: [{ shift: 'any', key: 'Escape' }] },
} satisfies Record<string, ShortcutDef>;
