/**
 * Hit-test vùng dưới con trỏ khi drag trên canvas.
 *
 * Gom logic `document.elementFromPoint` + `closest(...)` từng lặp trong
 * useObjectDrag (updateZone) và useToolbarDrag (detectZone) về một chỗ, với
 * ngữ nghĩa vùng rõ ràng.
 */

export type HitZone = 'trash' | 'overlay' | 'canvas' | 'outside';

/**
 * Phân loại vùng tại toạ độ screen (clientX/clientY):
 *   - 'trash'   — trên nút thùng rác (data-trash-drop)
 *   - 'overlay' — trên overlay screen-space khác (toolbar body, data-canvas-overlay)
 *   - 'canvas'  — trên vùng canvas surface (data-canvas-surface)
 *   - 'outside' — ngoài tất cả (header, document, hoặc không có element)
 *
 * Lưu ý thứ tự ưu tiên: trash > overlay > canvas > outside. Vì nút trash nằm
 * trong toolbar (cũng là overlay), phải check trash trước.
 */
export function hitZone(clientX: number, clientY: number): HitZone {
  const target = document.elementFromPoint(clientX, clientY);
  if (!(target instanceof Element)) return 'outside';
  if (target.closest('[data-trash-drop]')) return 'trash';
  if (target.closest('[data-canvas-overlay]')) return 'overlay';
  if (target.closest('[data-canvas-surface]')) return 'canvas';
  return 'outside';
}
