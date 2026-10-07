import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

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

/**
 * Bộ gõ đang ghép chữ (IME). Enter / Esc lúc này là để chốt / huỷ chữ đang ghép,
 * không phải lệnh. keyCode 229 cho trình duyệt cũ báo isComposing sai.
 */
export function isImeComposing(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229;
}

/**
 * onKeyDown cho ô sửa 1 dòng (tên board, URL): Enter → onCommit, Esc → onCancel.
 * Bỏ qua khi bộ gõ đang ghép chữ. Không truyền onCancel thì Esc đi tiếp
 * (VD Esc trong popup Link do lớp overlay của bộ điều phối phím đóng popup).
 */
export function editKeyHandler({
  onCommit,
  onCancel,
}: {
  onCommit: () => void;
  onCancel?: () => void;
}) {
  return (e: ReactKeyboardEvent) => {
    if (isImeComposing(e.nativeEvent)) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit();
    } else if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Giữ Tab trong modal: ở phần tử cuối Tab → về đầu, ở đầu Shift+Tab → về cuối.
 * Focus đang ngoài modal (hiếm, VD vừa bấm chuột ra nền) → kéo về trong.
 * Gọi từ phím Tab của lớp overlay (không consume), chỉ preventDefault khi xoay vòng.
 */
export function trapTab(e: KeyboardEvent, root: HTMLElement | null): void {
  if (!root) return;
  const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  const outside = !(active instanceof Node) || !root.contains(active);
  if (e.shiftKey && (outside || active === first)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (outside || active === last)) {
    e.preventDefault();
    first.focus();
  }
}
