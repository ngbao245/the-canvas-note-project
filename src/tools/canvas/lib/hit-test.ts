/**
 * Hit-test vùng dưới con trỏ khi drag trên canvas.
 *
 * Gom logic `document.elementFromPoint` + `closest(...)` từng lặp trong
 * useObjectDrag (updateZone) và useToolbarDrag (detectZone) về một chỗ, với
 * ngữ nghĩa vùng rõ ràng.
 */

export type HitZone = 'trash' | 'unsort' | 'overlay' | 'canvas' | 'outside';

/**
 * Phân loại vùng tại toạ độ screen (clientX/clientY):
 *   - 'trash'   — trên nút thùng rác (data-trash-drop)
 *   - 'unsort'  — trên UnsortToggle hoặc UnsortPanel (data-unsort-drop-target). Valid drop.
 *   - 'overlay' — trên overlay screen-space khác (toolbar body, data-canvas-overlay). Invalid.
 *   - 'canvas'  — trên vùng canvas surface (data-canvas-surface). Valid.
 *   - 'outside' — ngoài tất cả (header, document, hoặc không có element). Invalid.
 *
 * Thứ tự ưu tiên: trash > unsort > overlay > canvas > outside. UnsortToggle
 * cũng có data-canvas-overlay (để chặn wheel), nên check unsort trước overlay
 * để drop lên toggle được coi là valid drop, không phải invalid overlay.
 */
export function hitZone(clientX: number, clientY: number): HitZone {
  const target = document.elementFromPoint(clientX, clientY);
  if (!(target instanceof Element)) return 'outside';
  if (target.closest('[data-trash-drop]')) return 'trash';
  if (target.closest('[data-unsort-drop-target]')) return 'unsort';
  if (target.closest('[data-canvas-overlay]')) return 'overlay';
  if (target.closest('[data-canvas-surface]')) return 'canvas';
  return 'outside';
}
