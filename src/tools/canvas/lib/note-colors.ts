/**
 * Palette 6 màu cho Note (Milanote parity). Data color = user chọn, KHÔNG phải
 * theme token → hard-code hex OK theo rule bibo (data color exception).
 *
 * `null` (không có trong palette) = "mặc định" → ColorBar dùng `primary/60`
 * theme-aware.
 *
 * Lưu vào NoteData.color dưới dạng HEX string (không phải id) — user thấy đúng
 * màu cả khi Kiro đổi palette sau này (data-driven, không mapping runtime).
 *
 * Tên màu lưu dạng KEY dịch (`labelKey`), không lưu chữ: hằng số ngoài component chạy 1 lần
 * lúc tải file, lưu chữ ở đây thì đổi ngôn ngữ không cập nhật. Dịch lúc render bằng `t(labelKey)`.
 */
import type { MessageKey } from '@/lib/i18n';

export interface NoteColorSwatch {
  id: string;
  hex: string;
  labelKey: MessageKey;
}

export const NOTE_COLOR_PALETTE: readonly NoteColorSwatch[] = [
  { id: 'red', hex: '#f87171', labelKey: 'CANVAS.NOTE_COLOR.RED' },
  { id: 'orange', hex: '#fb923c', labelKey: 'CANVAS.NOTE_COLOR.ORANGE' },
  { id: 'yellow', hex: '#facc15', labelKey: 'CANVAS.NOTE_COLOR.YELLOW' },
  { id: 'green', hex: '#4ade80', labelKey: 'CANVAS.NOTE_COLOR.GREEN' },
  { id: 'blue', hex: '#60a5fa', labelKey: 'CANVAS.NOTE_COLOR.BLUE' },
  { id: 'purple', hex: '#a78bfa', labelKey: 'CANVAS.NOTE_COLOR.PURPLE' },
];
