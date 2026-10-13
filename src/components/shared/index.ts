/**
 * Shared state components — dùng chung toàn app khi chờ / trống / lỗi.
 * Theme theo token, hoạt động cả 2 phong cách (giai đoạn này giữ phẳng theo quyết định spec).
 */

export { Skeleton } from './Skeleton';
export { LoadingState } from './LoadingState';
export { EmptyState } from './EmptyState';
export { ErrorState } from './ErrorState';
export { UpdateBanner } from './UpdateBanner';
// TẠM: gỡ khi `canvas-sync` xử lý ngầm.
export { OfflineBadge } from './OfflineBadge';
