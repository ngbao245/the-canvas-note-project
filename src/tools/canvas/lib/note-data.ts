import type { NoteData } from '../types';

/**
 * Escape HTML entity trong text để không XSS khi wrap plain text vào tag.
 * Chỉ dùng cho migration data cũ (plain text → HTML) — Tiptap-generated HTML
 * đã sanitize sẵn qua ProseMirror.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const HTML_TAG_RE = /<\/?(p|h[1-6]|ul|ol|li|blockquote|strong|em|s|code|br)(\s|>|\/>)/i;

/**
 * Parse + migrate NoteData từ raw store data.
 *
 * Shape mới (Tiptap): { body: HTML string, color }.
 * Shape cũ (plain textarea): { title: string, body: plain text với '\n', color }.
 *
 * Migration detect: title field HOẶC body không có tag HTML.
 * Convert:
 *   - title (không rỗng) → `<h1>title</h1>` prepend.
 *   - body plain → split '\n', mỗi line → `<p>line</p>` (giữ cả line rỗng
 *     để giữ khoảng cách paragraph gốc).
 *
 * Migration KHÔNG persist ngược — Tiptap sẽ persist HTML lúc user edit lần đầu
 * (updateObjectData). Idempotent: chạy lần 2 với data mới sẽ skip migration
 * (detect HTML tag → early return).
 */
export function parseNoteData(rawData: unknown): NoteData {
  if (!rawData || typeof rawData !== 'object') {
    return { body: '<p></p>', color: null, heightMode: 'auto' };
  }
  const obj = rawData as Record<string, unknown>;
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const body = typeof obj.body === 'string' ? obj.body : '';
  const color = typeof obj.color === 'string' ? obj.color : null;
  // Backward-compat: data cũ chưa có heightMode → default 'auto' (RO grow).
  const heightMode: NoteData['heightMode'] =
    obj.heightMode === 'fixed' ? 'fixed' : 'auto';

  const hasHtmlTag = HTML_TAG_RE.test(body);

  // Data mới đã shape HTML + không có title legacy → passthrough.
  if (hasHtmlTag && !title) {
    return { body: body || '<p></p>', color, heightMode };
  }

  // Migrate old plain shape → HTML.
  const parts: string[] = [];
  if (title) parts.push(`<h1>${escapeHtml(title)}</h1>`);
  const lines = body.split('\n');
  for (const line of lines) parts.push(`<p>${escapeHtml(line)}</p>`);
  if (parts.length === 0) parts.push('<p></p>');

  return { body: parts.join(''), color, heightMode };
}
