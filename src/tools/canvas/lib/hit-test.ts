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

/**
 * Zone semantics chung cho 3 case drag (canvas / toolbar / unsort):
 *   - 'canvas' / 'trash' / 'unsort' — valid drop (mỗi zone có ý nghĩa khác nhau
 *     ở caller: canvas = move/create, trash = delete, unsort = move to unsort).
 *   - 'overlay' / 'outside' — invalid → cursor block, drop silent revert.
 *
 * Dùng để bật con trỏ not-allowed (setCursorOverride) thống nhất. Trước đó 3 case
 * tự định nghĩa invalid khác nhau (toolbar coi unsort là invalid, canvas coi
 * trash là valid, ...) — inconsistent feedback cho user.
 */
export function isInvalidZone(zone: HitZone): boolean {
  return zone === 'overlay' || zone === 'outside';
}

/**
 * True khi cursor KHÔNG ở "canvas trống" — nghĩa là đang hover:
 *   - Trash / Unsort target / Overlay / Outside (zones khác 'canvas'), HOẶC
 *   - Trên 1 BoardObject tile trong canvas (drop = move cross-board).
 *
 * Dùng cho preview dim feedback ở toolbar/unsort/object drag: khi cursor
 * ở vùng có "hành động khác" hoặc bị block, giảm opacity preview → user
 * biết drop tại đây sẽ không phải "drop vào canvas thường".
 *
 * @param excludeBoardTileIds — object ID đang drag, loại khỏi board tile check
 *   để item không tự dim khi cursor hover chính nó (nếu là board tile).
 */
export function isSecondaryZone(
  clientX: number,
  clientY: number,
  excludeBoardTileIds: string[] = [],
): boolean {
  const zone = hitZone(clientX, clientY);
  if (zone !== 'canvas') return true;
  const target = document.elementFromPoint(clientX, clientY);
  if (target instanceof Element) {
    const tileEl = target.closest('[data-board-tile-id]');
    if (tileEl instanceof HTMLElement) {
      const tileId = tileEl.getAttribute('data-board-tile-id');
      if (tileId && !excludeBoardTileIds.includes(tileId)) return true;
    }
  }
  return false;
}
