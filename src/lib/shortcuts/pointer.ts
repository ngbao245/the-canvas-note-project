import { getKeyboardPlatform } from './platform';

/**
 * Phím giữ khi click / kéo, theo Kiểu bàn phím. Spec `docs/legacy/specs/shortcuts/` US-7.
 *   macOS: Cmd + click = chọn thêm, Cmd + kéo = kéo màn hình. Ctrl + click là chuột phải
 *          (macOS tự đổi), nên các handler chọn / kéo phải bỏ qua để menu tự mở.
 *   Windows / Linux: Ctrl + click / Ctrl + kéo như cũ.
 *
 * Chỉ dùng cho thao tác chuột. Phím tắt bàn phím vẫn nhận cả Ctrl lẫn Cmd (combo.ts).
 * Zoom bằng lăn chuột dùng `isZoomWheel` (không theo Kiểu bàn phím, lý do ở hàm).
 */

interface ModifierState {
  ctrlKey: boolean;
  metaKey: boolean;
}

/** Đang giữ phím chính để chọn thêm / kéo màn hình (Cmd trên macOS, Ctrl nơi khác). */
export function isPrimaryModifier(e: ModifierState): boolean {
  return getKeyboardPlatform() === 'macos' ? e.metaKey : e.ctrlKey;
}

/**
 * Lăn chuột này là zoom (Ctrl / Cmd + lăn, hoặc pinch trackpad).
 * Nhận cả 2 phím, không theo Kiểu bàn phím: Chrome gửi pinch trackpad dưới dạng
 * `ctrlKey` kể cả trên Mac, dùng `isPrimaryModifier` thì Mac mất pinch-zoom.
 */
export function isZoomWheel(e: ModifierState): boolean {
  return e.ctrlKey || e.metaKey;
}

/** macOS: Ctrl + nút trái = chuột phải. Handler chọn / kéo bỏ qua, để `contextmenu` lo. */
export function isMacSecondaryClick(e: ModifierState & { button: number }): boolean {
  return e.button === 0 && e.ctrlKey && getKeyboardPlatform() === 'macos';
}
