/**
 * Chuỗi class cho chuyển động tương tác (hover, nhấn). Dùng như FOCUS_RING: một
 * nguồn chuẩn, không chép chuỗi ra từng file. Chỉ lo NHỊP chuyển động; màu hover
 * (`hover:bg-muted`...) vẫn đặt tại component.
 *
 * Chỉ transition màu + transform, không gồm box-shadow → viền focus hiện ngay.
 */

/** Nút icon / tile (toolbar, header): hover mượt, nhấn lún nhẹ. Disabled không lún. */
export const PRESSABLE_MOTION =
  'transition-[color,background-color,opacity,transform] duration-quick ease-standard active:scale-[0.96] active:duration-fast disabled:active:scale-100 aria-disabled:active:scale-100';

/** Nút chữ / pill ở chrome (nút mở menu header): hover mượt, không lún. */
export const HOVER_MOTION = 'transition-colors duration-quick ease-standard';

/** Dòng trong menu / danh sách: đổi nền nhanh, rê qua nhiều dòng không kéo vệt. */
export const ROW_MOTION = 'transition-colors duration-fast ease-standard';
