import { useEffect, useRef, type RefObject } from 'react';
import { useEscapeLayer } from '@/lib/shortcuts';

/**
 * Đóng popup mở từ toolbar (đi cùng `<ToolbarPopup>`): click ngoài + Escape.
 * Bỏ qua click trên chính nút mở (nút tự toggle qua state onClick → tránh đóng 2 lần).
 * `onRefocus`: popup có ô nhập lấy focus khỏi editor (Link, TextStyle) cần focus lại
 * editor khi Esc đóng; popup không có ô nhập (Color) bỏ trống.
 */
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

  // Esc ở lớp overlay (consume): CHỈ đóng popup, không lọt xuống canvas (bỏ chọn)
  // hay NoteEditor (thoát edit). Chạy cả khi focus trong ô URL của popup Link.
  useEscapeLayer(() => {
    callbacksRef.current.onClose();
    callbacksRef.current.onRefocus?.();
  });

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target;
      if (t instanceof Element && popupRef.current?.contains(t)) return;
      if (t instanceof Element && t.closest(`[aria-label="${anchorLabel}"]`)) return;
      callbacksRef.current.onClose();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => window.removeEventListener('pointerdown', onPointerDown, true);
  }, [popupRef, anchorLabel]);
}
