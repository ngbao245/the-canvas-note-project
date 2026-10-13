import type { ObjectRendererProps } from '../../hooks/useObjectRegistry';

/**
 * Rect debug object (Phase A). Giữ lại để tương thích data cũ trong IndexedDB —
 * board đã tạo từ Phase A vẫn còn object type='rect'. Không hiện trên toolbar.
 * Định nghĩa loại ở `rect-type.ts`.
 */
export function RectRenderer({ isSelected }: ObjectRendererProps) {
  return (
    <div
      className="h-full w-full rounded-md"
      style={{
        background: 'var(--primary-soft)',
        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--primary-hover)'}`,
      }}
    />
  );
}
