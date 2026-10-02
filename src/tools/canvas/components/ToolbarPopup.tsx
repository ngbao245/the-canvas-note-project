import { forwardRef, useEffect, useRef, type ReactNode, type RefObject } from 'react';

/**
 * Overlay primitive dùng chung cho các popup mở từ toolbar (element mode + editing
 * mode). Tách khỏi từng type toolbar để không lặp mechanic khi thêm popup mới
 * (Task Priority/DueDate/Assignee, Link EditURL, Image AltText/Crop, ...).
 *
 * 2 phần:
 *   1. Component `<ToolbarPopup>` — wrapper `<div>` với `data-canvas-overlay`
 *      + positioning left-full ml-2 + surface style border/bg-card/shadow.
 *      forwardRef để hook dưới quan sát vùng click-outside.
 *   2. Hook `useToolbarPopupClose` — attach pointerdown outside + Escape
 *      listener. Skip khi click chính button anchor (button toggle tự đóng qua
 *      state onClick → tránh double close). `onRefocus` optional: Escape close
 *      trong popup có input focus rời editor (Link/TextStyle) cần re-focus lại
 *      editor; popup không có input (Color) truyền undefined.
 *
 * `data-canvas-overlay` là contract chung với NoteEditor `onBlur` guard —
 * relatedTarget.closest('[data-canvas-overlay]') skip commit để giữ editing
 * state (Milanote parity: toolbar + popup là "vùng đặc biệt").
 */

interface ToolbarPopupProps {
  /** Extend positioning + layout classes (VD 'flex w-40 flex-col gap-1 p-2').
   *  Base class đã có positioning + surface + border. */
  className?: string;
  children: ReactNode;
}

export const ToolbarPopup = forwardRef<HTMLDivElement, ToolbarPopupProps>(
  function ToolbarPopup({ className = '', children }, ref) {
    return (
      <div
        ref={ref}
        data-canvas-overlay="true"
        className={`absolute left-full top-0 z-toolbar ml-2 rounded-lg border border-border bg-card shadow-lg ${className}`}
      >
        {children}
      </div>
    );
  },
);

interface UseToolbarPopupCloseOptions {
  popupRef: RefObject<HTMLDivElement | null>;
  /** `aria-label` của button anchor mở popup. Match qua closest để skip
   *  pointerdown trên chính anchor — tránh double close (state toggle + document
   *  listener cùng fire). */
  anchorLabel: string;
  onClose: () => void;
  /** Gọi khi Escape đóng popup. Dùng cho popup có input focus rời editor
   *  (Link URL input, TextStyle list) — cần chain().focus() re-focus editor.
   *  Popup không có input rời focus (Color) truyền undefined. */
  onRefocus?: () => void;
}

export function useToolbarPopupClose({
  popupRef,
  anchorLabel,
  onClose,
  onRefocus,
}: UseToolbarPopupCloseOptions): void {
  // Caller truyền callback inline (đổi mỗi render). Popup trong editing mode
  // re-render mỗi transaction Tiptap → nếu để callback vào deps thì listener
  // gỡ/gắn lại liên tục. Giữ bản mới nhất trong ref, effect chỉ chạy 1 lần.
  const callbacksRef = useRef({ onClose, onRefocus });
  callbacksRef.current = { onClose, onRefocus };

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target;
      if (t instanceof Element && popupRef.current?.contains(t)) return;
      if (t instanceof Element && t.closest(`[aria-label="${anchorLabel}"]`)) return;
      callbacksRef.current.onClose();
    };
    // Capture phase + stopPropagation: Escape khi popup mở CHỈ đóng popup.
    // Không để lọt xuống useCanvasKeys (clear selection) hay NoteEditor
    // keydown (thoát edit) — 2 listener đó chạy ở bubble/target phase, sau
    // capture ở window.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      callbacksRef.current.onClose();
      callbacksRef.current.onRefocus?.();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [popupRef, anchorLabel]);
}
