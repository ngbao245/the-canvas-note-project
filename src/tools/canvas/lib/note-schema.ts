import { getSchema, type Extensions } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { DOMParser as PMDOMParser, DOMSerializer } from '@tiptap/pm/model';
import { NoteBlockKeys } from './note-block-keys';

/**
 * Schema nội dung Note — nguồn chuẩn cho cả editor lẫn bộ lọc HTML.
 *
 * Editor (NoteObject.tsx) dùng list này + Placeholder (chỉ là UI, không đổi
 * schema). Bộ lọc `sanitizeNoteHtml` dùng đúng list này → HTML sau lọc khớp
 * 100% những gì editor hiểu được. Thêm extension mới (VD Image, Highlight) thì
 * thêm ở đây, cả 2 phía tự theo.
 */
export const NOTE_SCHEMA_EXTENSIONS: Extensions = [
  // StarterKit v3 đã gồm Link → tắt bản trong kit, dùng bản cấu hình riêng bên dưới
  // (trước đây Link bị đăng ký 2 lần: cảnh báo "Duplicate extension names").
  StarterKit.configure({ link: false }),
  Link.configure({
    // Edit mode: click link không mở tab mới — user cần click để đặt caret sửa.
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
    HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    // Mặc định extension-link đã chặn href `javascript:` / `data:` (isAllowedUri)
    // cả lúc parse lẫn lúc render → link độc bị bỏ mark, chỉ còn text.
  }),
  // Mã từng khối (`data-key`). Nằm trong schema → bộ lọc HTML lúc hiển thị cũng giữ mã.
  NoteBlockKeys,
];

// Dựng 1 lần, dùng lại. getSchema tốn công (resolve toàn bộ extension).
let parser: PMDOMParser | null = null;
let serializer: DOMSerializer | null = null;

function getCodec(): { parser: PMDOMParser; serializer: DOMSerializer } {
  if (!parser || !serializer) {
    const schema = getSchema(NOTE_SCHEMA_EXTENSIONS);
    parser = PMDOMParser.fromSchema(schema);
    serializer = DOMSerializer.fromSchema(schema);
  }
  return { parser, serializer };
}

// Cache kết quả theo body. NoteView render lại nhiều (drag, zoom, select) mà
// body ít đổi → tránh parse lại. Giới hạn kích thước để không phình bộ nhớ.
const CACHE_LIMIT = 300;
const cache = new Map<string, string>();

/**
 * Lọc HTML của Note: chỉ giữ node/mark/attribute mà schema Note cho phép
 * (paragraph, heading, list, blockquote, code, bold, italic, link hợp lệ...).
 * Mọi thứ khác bị bỏ: `<script>`, `<img onerror>`, `<iframe>`, `style`,
 * `onclick`, href `javascript:`...
 *
 * An toàn vì cả parse lẫn serialize đều làm trên document tách rời tạo bằng
 * `DOMParser` — trình duyệt không tải ảnh, không chạy script, không gắn
 * handler trong lúc lọc.
 *
 * Dùng ở 2 chỗ: lúc hiển thị (NoteView — chặn cả data cũ trong IndexedDB) và
 * lúc paste (registry `sanitizeData` — để data lưu xuống đã sạch).
 */
export function sanitizeNoteHtml(html: string): string {
  const hit = cache.get(html);
  if (hit !== undefined) return hit;

  const { parser: p, serializer: s } = getCodec();
  const doc = new window.DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const node = p.parse(doc.body);
  const fragment = s.serializeFragment(node.content, { document: doc });
  const container = doc.createElement('div');
  container.appendChild(fragment);
  const result = container.innerHTML || '<p></p>';

  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(html, result);
  return result;
}
