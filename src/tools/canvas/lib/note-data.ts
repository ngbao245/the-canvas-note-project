import type { NoteData } from '../types';

const EMPTY_BODY = '<p></p>';

/**
 * Đọc NoteData từ data thô trong store: chỉ điền giá trị mặc định cho trường
 * thiếu / sai kiểu. Không chuyển dạng cũ (title + chữ thường) nữa: bạn chốt bỏ
 * dữ liệu cũ (2026-10-14). `body` luôn là HTML, không bao giờ rỗng (INV-NOTE-01).
 * Body đi vào DOM vẫn qua sanitizeNoteHtml ở nơi render.
 */
export function parseNoteData(rawData: unknown): NoteData {
  // Data thiếu / sai kiểu → đọc như object rỗng: mọi trường về mặc định.
  // `parseNoteData(null)` là nguồn chuẩn của note mới (note-type `defaultData`).
  const obj: Record<string, unknown> =
    rawData && typeof rawData === 'object' ? (rawData as Record<string, unknown>) : {};
  const body = typeof obj.body === 'string' && obj.body.trim() !== '' ? obj.body : EMPTY_BODY;
  const color = stringOrNull(obj.color);
  const background = stringOrNull(obj.background);
  const textColor = stringOrNull(obj.textColor);
  const heightMode: NoteData['heightMode'] = obj.heightMode === 'fixed' ? 'fixed' : 'auto';
  const locked = obj.locked === true;
  return { body, color, background, textColor, heightMode, locked };
}

/**
 * Object có đang bị khoá vị trí không (note + board tile có `data.locked`). Dùng ở
 * hook kéo + resize để chặn di chuyển / đổi cỡ. Type khác → luôn false.
 */
export function isObjectLocked(type: string, data: unknown): boolean {
  if (type === 'note') return parseNoteData(data).locked;
  if (type === 'board') {
    return !!data && typeof data === 'object' && (data as Record<string, unknown>).locked === true;
  }
  return false;
}

function stringOrNull(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null;
}
