import type { CanvasObject } from '../types';
import type { ObjectTemplate } from '../engine/actions';

/**
 * Clipboard integration cho canvas: copy/paste objects qua browser Clipboard API.
 *
 * Format: `canvas-clip:v1:{json}` — prefix magic để phân biệt clipboard text
 * bình thường (paste text lung tung không tạo object). Payload chỉ chứa
 * type/geometry/data của từng object, giữ nguyên toạ độ gốc. Paste dịch cả
 * cụm theo offset (xem `pasteObjects`) nên không cần lưu điểm neo riêng.
 *
 * Cross-board OK: payload không chứa `boardId`, `id`, `createdAt`, `updatedAt`,
 * `unsortIndex` — paste gán boardId = board hiện tại, id + timestamp mới,
 * unsortIndex = null (luôn đặt canvas).
 */

const CLIPBOARD_MAGIC = 'canvas-clip:v1:';

export interface ClipboardPayload {
  version: 1;
  objects: ObjectTemplate[];
}

/**
 * Ghi objects ra clipboard system. Return false nếu API không có hoặc bị chặn
 * quyền — caller bỏ qua được (copy fail thì user copy lại).
 */
export async function writeCanvasClipboard(objects: CanvasObject[]): Promise<boolean> {
  if (objects.length === 0) return false;
  if (!navigator.clipboard?.writeText) return false;

  const payload: ClipboardPayload = {
    version: 1,
    objects: objects.map((o) => ({ type: o.type, geometry: o.geometry, data: o.data })),
  };

  try {
    await navigator.clipboard.writeText(CLIPBOARD_MAGIC + JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/**
 * Đọc clipboard system, parse payload nếu khớp prefix. Return null (im lặng)
 * khi clipboard rỗng, text thường, JSON lỗi, sai version hoặc bị chặn quyền —
 * Ctrl+V trên text bình thường không được báo lỗi.
 */
export async function readCanvasClipboard(): Promise<ClipboardPayload | null> {
  if (!navigator.clipboard?.readText) return null;

  let text: string;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    return null;
  }
  if (!text.startsWith(CLIPBOARD_MAGIC)) return null;

  try {
    const parsed = JSON.parse(text.slice(CLIPBOARD_MAGIC.length)) as ClipboardPayload;
    if (parsed?.version !== 1) return null;
    if (!Array.isArray(parsed.objects) || parsed.objects.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}
