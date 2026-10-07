/**
 * Helper DOM dùng chung toàn app.
 */

/**
 * True nếu target là input/textarea/contentEditable (gồm editor Tiptap/ProseMirror) —
 * dùng để bỏ qua phím tắt khi người dùng đang gõ chữ.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}
