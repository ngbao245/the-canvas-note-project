/**
 * Người dùng có bật giảm chuyển động không. Đọc mới mỗi lần gọi nên đổi cài đặt
 * hệ điều hành lúc app đang mở vẫn đúng ngay. Dùng cho chuyển động viết bằng JS
 * (`el.animate`, ramp camera); phần CSS đã tự xử lý trong motion.css.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
