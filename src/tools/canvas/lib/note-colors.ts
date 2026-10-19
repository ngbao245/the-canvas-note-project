/**
 * Màu note (parity Milanote, spec `canvas-note-color`). Data color = người dùng
 * chọn, KHÔNG phải theme token → hard-code hex OK.
 *
 * Lưu hex vào NoteData (`color` thanh, `background` nền, `textColor` chữ đi kèm),
 * không lưu id (INV-NOTE-17): đổi bảng màu sau này không đổi màu note cũ.
 *
 * Popup Màu note dùng chung 2 hàng màu với board (`board-colors.ts`). Chữ note luôn
 * tự tính theo nền (bạn chốt 2026-10-16); `textColor` của note cũ vẫn được đọc
 * (`noteInkColor`), không tạo mới nữa.
 */
import type { NoteData } from '../types';
import { INK_ON_LIGHT, isLightHex } from './color-contrast';

export type NoteColorFields = Pick<NoteData, 'color' | 'background' | 'textColor'>;

/** Giá trị `background` đặc biệt: note không nền (thấy lưới canvas). */
export const NOTE_BG_TRANSPARENT = 'transparent';

/** Mực chữ trên nền tối: dịu hơn trắng tinh của board. */
const INK_ON_DARK = '#f5f5f5';

/** So màu không phân biệt hoa thường (ô chọn màu trình duyệt trả chữ thường). */
export function sameColor(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Màu chữ của note: màu đi kèm → tự tương phản theo nền → null (màu chữ theme).
 * Nền trong suốt / không nền → null.
 */
export function noteInkColor(fields: Pick<NoteData, 'background' | 'textColor'>): string | null {
  if (fields.textColor) return fields.textColor;
  const bg = fields.background;
  if (!bg || bg === NOTE_BG_TRANSPARENT) return null;
  const light = isLightHex(bg);
  if (light === null) return null;
  return light ? INK_ON_LIGHT : INK_ON_DARK;
}
