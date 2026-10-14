import type { NoteData } from '../types';

const EMPTY_BODY = '<p></p>';

/**
 * Đọc NoteData từ data thô trong store: chỉ điền giá trị mặc định cho trường
 * thiếu / sai kiểu. Không chuyển dạng cũ (title + chữ thường) nữa: bạn chốt bỏ
 * dữ liệu cũ (2026-10-14). `body` luôn là HTML, không bao giờ rỗng (INV-NOTE-01).
 * Body đi vào DOM vẫn qua sanitizeNoteHtml ở nơi render.
 */
export function parseNoteData(rawData: unknown): NoteData {
  if (!rawData || typeof rawData !== 'object') {
    return { body: EMPTY_BODY, color: null, heightMode: 'auto' };
  }
  const obj = rawData as Record<string, unknown>;
  const body = typeof obj.body === 'string' && obj.body.trim() !== '' ? obj.body : EMPTY_BODY;
  const color = typeof obj.color === 'string' ? obj.color : null;
  const heightMode: NoteData['heightMode'] = obj.heightMode === 'fixed' ? 'fixed' : 'auto';
  return { body, color, heightMode };
}
