/**
 * Palette 6 màu cho Note (Milanote parity). Data color = user chọn, KHÔNG phải
 * theme token → hard-code hex OK theo rule bibo (data color exception).
 *
 * `null` (không có trong palette) = "mặc định" → ColorBar dùng `primary/60`
 * theme-aware.
 *
 * Lưu vào NoteData.color dưới dạng HEX string (không phải id) — user thấy đúng
 * màu cả khi Kiro đổi palette sau này (data-driven, không mapping runtime).
 */
export interface NoteColorSwatch {
  id: string;
  hex: string;
  label: string;
}

export const NOTE_COLOR_PALETTE: readonly NoteColorSwatch[] = [
  { id: 'red', hex: '#f87171', label: 'Đỏ' },
  { id: 'orange', hex: '#fb923c', label: 'Cam' },
  { id: 'yellow', hex: '#facc15', label: 'Vàng' },
  { id: 'green', hex: '#4ade80', label: 'Xanh lá' },
  { id: 'blue', hex: '#60a5fa', label: 'Xanh dương' },
  { id: 'purple', hex: '#a78bfa', label: 'Tím' },
] as const;
