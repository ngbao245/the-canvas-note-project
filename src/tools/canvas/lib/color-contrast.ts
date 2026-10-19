/**
 * Độ sáng của màu nền (data color người dùng chọn) để chọn mực chữ / icon tương
 * phản. Dùng chung board tile + note: cùng ngưỡng thì "nhóm đậm = chữ trắng" trong
 * popup Màu đúng cho cả 2 loại.
 */

/** Mực tối dùng trên nền sáng (board + note chung). */
export const INK_ON_LIGHT = '#17171b';

/** Ngưỡng 0.6: cyan / vàng / xanh lá / xanh dương → chữ tối; đỏ / xanh đậm → chữ sáng. */
const LIGHT_THRESHOLD = 0.6;

/** Hex `#rgb` / `#rrggbb` sáng hay tối (độ sáng cảm nhận). Không đọc được → null. */
export function isLightHex(hex: string): boolean | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > LIGHT_THRESHOLD;
}
