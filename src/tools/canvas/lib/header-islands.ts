/**
 * Kích thước hàng đảo nổi của header canvas (Cài đặt → Canvas → Kiểu header = Đảo nổi).
 * Thanh công cụ trái và Khay chờ lùi xuống dưới hàng này để không đè lên đảo.
 */

/** Cách mép màn hình (px, không phóng theo Kích thước giao diện). */
export const ISLANDS_EDGE = 12;

/** Chiều cao 1 đảo ở cỡ giao diện Vừa (px, khớp `h-11`). */
export const ISLAND_HEIGHT = 44;

/** Khoảng hở giữa hàng đảo và thứ nằm dưới (px). */
const ISLANDS_GAP = 8;

/** Khoảng lùi từ mép trên màn tới chỗ thanh công cụ / Khay chờ bắt đầu. */
export function islandsTopInset(uiScale: number): number {
  return ISLANDS_EDGE + ISLAND_HEIGHT * uiScale + ISLANDS_GAP;
}
