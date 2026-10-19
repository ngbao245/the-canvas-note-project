/**
 * Palette màu chữ + tô nền (highlight) cho Note (Milanote parity). Giống
 * `note-colors.ts`: màu là data user chọn, KHÔNG phải theme token → hard-code
 * hex OK theo rule bibo (data color exception).
 *
 * Lưu vào body HTML dưới dạng mark (TextStyle+Color cho chữ, Highlight cho nền),
 * giá trị là HEX. Đổi palette sau không đổi màu đã lưu (data-driven).
 *
 * Tên lưu dạng KEY dịch (`labelKey`), dịch lúc render (hằng ngoài component chạy
 * 1 lần lúc tải file). Xem cách dùng ở `NoteToolbar` (popup Text style).
 *
 * `hex: null` = bỏ màu / bỏ nền (về mặc định). Chỉ 1 swatch "mặc định" mỗi bảng.
 */
import type { MessageKey } from '@/lib/i18n';

export interface NoteSwatch {
  id: string;
  /** null = mặc định (bỏ mark). Khác null = hex áp vào mark. */
  hex: string | null;
  labelKey: MessageKey;
}

/** Màu chữ: mặc định (theo theme) + 5 màu. Đo từ Milanote Text style → Color. */
export const NOTE_TEXT_COLORS: readonly NoteSwatch[] = [
  { id: 'default', hex: null, labelKey: 'CANVAS.NOTE_TOOLBAR.TEXT_COLOR.DEFAULT' },
  { id: 'blue', hex: '#3b82f6', labelKey: 'CANVAS.NOTE_TOOLBAR.TEXT_COLOR.BLUE' },
  { id: 'green', hex: '#22c55e', labelKey: 'CANVAS.NOTE_TOOLBAR.TEXT_COLOR.GREEN' },
  { id: 'orange', hex: '#f97316', labelKey: 'CANVAS.NOTE_TOOLBAR.TEXT_COLOR.ORANGE' },
  { id: 'red', hex: '#ef4444', labelKey: 'CANVAS.NOTE_TOOLBAR.TEXT_COLOR.RED' },
  { id: 'gray', hex: '#9ca3af', labelKey: 'CANVAS.NOTE_TOOLBAR.TEXT_COLOR.GRAY' },
];

/** Tô nền: không nền + 5 màu nhạt. Đo từ Milanote Text style → Highlight. */
export const NOTE_HIGHLIGHT_COLORS: readonly NoteSwatch[] = [
  { id: 'none', hex: null, labelKey: 'CANVAS.NOTE_TOOLBAR.HIGHLIGHT_COLOR.NONE' },
  { id: 'blue', hex: '#bfdbfe', labelKey: 'CANVAS.NOTE_TOOLBAR.HIGHLIGHT_COLOR.BLUE' },
  { id: 'green', hex: '#bbf7d0', labelKey: 'CANVAS.NOTE_TOOLBAR.HIGHLIGHT_COLOR.GREEN' },
  { id: 'yellow', hex: '#fef08a', labelKey: 'CANVAS.NOTE_TOOLBAR.HIGHLIGHT_COLOR.YELLOW' },
  { id: 'pink', hex: '#fbcfe8', labelKey: 'CANVAS.NOTE_TOOLBAR.HIGHLIGHT_COLOR.PINK' },
  { id: 'gray', hex: '#e5e7eb', labelKey: 'CANVAS.NOTE_TOOLBAR.HIGHLIGHT_COLOR.GRAY' },
];
