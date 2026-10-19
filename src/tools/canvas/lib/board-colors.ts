/**
 * Bảng màu khối vuông board tile + màu icon board. Màu gốc đo Milanote (MCP
 * 2026-10-15, theme tối). Data color = người dùng chọn → hard-code hex OK. Lưu hex
 * vào `Board.color`.
 *
 * Popup Màu board chia 2 nhóm theo độ sáng (spec canvas-board-color-polish): nền đậm
 * (icon/chữ trắng) và nền sáng (icon/chữ đen), cùng ngưỡng với màu icon tự động,
 * nên "nhóm đậm = chữ trắng" luôn đúng.
 *
 * Tên màu lưu KEY dịch, dịch lúc render. Màu gợi ý không có tên → tooltip là hex.
 */
import type { MessageKey } from '@/lib/i18n';
import { BOARD_COLOR_PALETTE } from '../types';
import { INK_ON_LIGHT, isLightHex } from './color-contrast';

export interface BoardSwatch {
  hex: string;
  /** null = không có tên (màu gợi ý), tooltip hiện hex. */
  labelKey: MessageKey | null;
}

/** Màu mặc định của board (ô đầu, board mới ở Home cũng dùng màu này). */
export const BOARD_DEFAULT_COLOR: string = BOARD_COLOR_PALETTE[0];

/**
 * 2 hàng 10 ô cho popup Màu (bạn chốt 2026-10-16): nền đậm → chữ trắng, nền sáng →
 * chữ đen; màu khác thì user tự chọn qua Màu tuỳ chỉnh. Màu gợi ý không có tên →
 * tooltip là hex. 11 màu chuẩn cũ giữ tên để không mất tooltip.
 */
export const BOARD_DARK_COLORS: readonly BoardSwatch[] = [
  { hex: '#4e4e4e', labelKey: 'CANVAS.NOTE_COLOR.GREY' },
  { hex: '#5a3b2e', labelKey: null },
  { hex: '#d58558', labelKey: 'CANVAS.NOTE_COLOR.BROWN' },
  { hex: '#2e6e4e', labelKey: null },
  { hex: '#1f6f78', labelKey: null },
  { hex: '#ff5757', labelKey: 'CANVAS.NOTE_COLOR.RED' },
  { hex: '#ad6fff', labelKey: 'CANVAS.NOTE_COLOR.PURPLE' },
  { hex: '#5882f8', labelKey: 'CANVAS.NOTE_COLOR.DEEP_BLUE' },
];

/** Phần 2: nền sáng, icon/chữ đen. */
export const BOARD_LIGHT_COLORS: readonly BoardSwatch[] = [
  { hex: '#62dbc8', labelKey: 'CANVAS.NOTE_COLOR.CYAN' },
  { hex: '#7cd651', labelKey: 'CANVAS.NOTE_COLOR.GREEN' },
  { hex: '#96b74a', labelKey: null },
  { hex: '#ffd14d', labelKey: 'CANVAS.NOTE_COLOR.YELLOW' },
  { hex: '#f4ce6d', labelKey: null },
  { hex: '#ff8d48', labelKey: 'CANVAS.NOTE_COLOR.ORANGE' },
  { hex: '#e39d5e', labelKey: null },
  { hex: '#ff6ed4', labelKey: 'CANVAS.NOTE_COLOR.PINK' },
  { hex: '#4ebafd', labelKey: 'CANVAS.NOTE_COLOR.BLUE' },
  { hex: '#c9d6a9', labelKey: null },
];

/** Mực icon/chữ trên nền tối (board dùng trắng tinh, note dịu hơn). */
const INK_ON_DARK = '#ffffff';

/** Nền sáng (mực đen) hay không. Màu lạ → coi như nền đậm. */
function isLightBg(hex: string): boolean {
  return isLightHex(hex) === true;
}

/**
 * Giá trị đặc biệt của `Board.color`: nền theo giao diện (sáng → trắng, tối → đen).
 * Lưu chuỗi này chứ không lưu hex để đổi giao diện thì board đổi theo.
 */
export const BOARD_COLOR_THEME = 'theme';

/** Hex thật để vẽ nền board. Mọi chỗ vẽ `Board.color` phải đi qua hàm này. */
export function resolveBoardColor(color: string, theme: 'light' | 'dark'): string {
  if (color !== BOARD_COLOR_THEME) return color;
  return theme === 'light' ? INK_ON_DARK : INK_ON_LIGHT;
}

/** Ô "Theo giao diện" trong popup: chia chéo trắng / đen. */
export const BOARD_THEME_SWATCH_BACKGROUND = `linear-gradient(to bottom right, ${INK_ON_DARK} 50%, ${INK_ON_LIGHT} 50%)`;

/**
 * Màu icon / chữ trên khối vuông board, luôn tự tính theo nền (bạn chốt 2026-10-16,
 * như Milanote): nền đậm → trắng, nền sáng → đen. `bgHex` là nền đã đổi
 * (`resolveBoardColor`).
 */
export function boardInkColor(bgHex: string): string {
  return isLightBg(bgHex) ? INK_ON_LIGHT : INK_ON_DARK;
}

/**
 * Nền của ô màu (popup Màu board / note, ô xem trước trên nút Màu board). Nền ra chữ
 * đen: ô chia chéo, nửa trên trái màu nền, nửa dưới phải màu chữ → nhìn ô biết luôn
 * chữ đen. Nền ra chữ trắng: ô màu trơn.
 */
export function boardSwatchBackground(hex: string): string {
  return isLightBg(hex) ? `linear-gradient(to bottom right, ${hex} 50%, ${INK_ON_LIGHT} 50%)` : hex;
}
