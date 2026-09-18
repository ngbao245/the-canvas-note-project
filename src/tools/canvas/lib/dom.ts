/**
 * Helper DOM dùng chung cho canvas.
 */

/**
 * True nếu target là input/textarea/contentEditable — dùng để bỏ qua keyboard
 * shortcut khi user đang gõ chữ. Trước đây copy y hệt trong usePointerInteraction,
 * useCanvasKeys, useDeleteKey → gom về một chỗ.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}
