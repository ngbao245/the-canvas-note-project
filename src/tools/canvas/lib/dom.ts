/**
 * Helper DOM dùng chung cho canvas. isEditableTarget đã chuyển lên `@/lib/dom` để phím tắt
 * toàn app dùng chung; giữ re-export để các file canvas không phải đổi import.
 */
export { isEditableTarget } from '@/lib/dom';
