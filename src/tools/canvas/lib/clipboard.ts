import { geometrySchema, type CanvasObject } from '../types';
import type { ObjectTemplate } from '../engine/actions';
import { getObjectTypeDefinition } from '../hooks/useObjectRegistry';

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
 * Kiểm từng object trong payload. Clipboard là nguồn không tin được: trang web
 * bất kỳ đều ghi được chuỗi `canvas-clip:v1:...`. Bỏ object khi:
 *   - type chưa đăng ký trong registry,
 *   - geometry sai kiểu (Zod geometrySchema),
 *   - sanitizePastedData của type trả null.
 * Data được thay bằng bản đã lọc (VD Note: body HTML qua schema Tiptap).
 */
function validateTemplates(raw: unknown[]): ObjectTemplate[] {
  const result: ObjectTemplate[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const { type, geometry, data } = item as Record<string, unknown>;
    if (typeof type !== 'string') continue;
    const def = getObjectTypeDefinition(type);
    if (!def) continue;
    const geo = geometrySchema.safeParse(geometry);
    if (!geo.success) continue;
    const cleanData = def.sanitizePastedData ? def.sanitizePastedData(data) : data;
    if (cleanData === null) continue;
    result.push({ type, geometry: geo.data, data: cleanData });
  }
  return result;
}

/**
 * Đọc clipboard system, parse payload nếu khớp prefix, lọc từng object. Return
 * null (im lặng) khi clipboard rỗng, text thường, JSON lỗi, sai version, bị chặn
 * quyền hoặc không còn object hợp lệ nào — Ctrl+V trên text bình thường không
 * được báo lỗi.
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
    const parsed: unknown = JSON.parse(text.slice(CLIPBOARD_MAGIC.length));
    if (!parsed || typeof parsed !== 'object') return null;
    const { version, objects } = parsed as Record<string, unknown>;
    if (version !== 1 || !Array.isArray(objects)) return null;
    const valid = validateTemplates(objects);
    if (valid.length === 0) return null;
    return { version: 1, objects: valid };
  } catch {
    return null;
  }
}
