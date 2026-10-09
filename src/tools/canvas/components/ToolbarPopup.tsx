import { forwardRef, type ReactNode } from 'react';

/**
 * Overlay primitive dùng chung cho các popup mở từ toolbar (element mode + editing
 * mode). Tách khỏi từng type toolbar để không lặp mechanic khi thêm popup mới
 * (Task Priority/DueDate/Assignee, Link EditURL, Image AltText/Crop, ...).
 *
 * Wrapper `<div>` với `data-canvas-overlay` + positioning left-full ml-2 + surface
 * style border/bg-card/shadow. forwardRef để hook `useToolbarPopupClose`
 * (`hooks/useToolbarPopupClose.ts`) quan sát vùng click-outside.
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

export const ToolbarPopup = forwardRef<HTMLDivElement, ToolbarPopupProps>(function ToolbarPopup(
  { className = '', children },
  ref,
) {
  return (
    <div
      ref={ref}
      data-canvas-overlay="true"
      className={`absolute left-full top-0 z-toolbar ml-2 rounded-lg border border-border bg-card shadow-lg ${className}`}
    >
      {children}
    </div>
  );
});
