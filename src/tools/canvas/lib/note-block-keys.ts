import { UniqueID } from '@tiptap/extension-unique-id';

/**
 * Mã cho từng khối chữ trong note (spec `.kiro/specs/canvas-note-block-keys/`).
 *
 * Giống `attrs.key` của Milanote: mỗi khối cấp ngoài cùng (đoạn, tiêu đề, list...)
 * có 1 mã không đổi theo vị trí, ghi trong HTML là `data-key="..."`. Card Clipper
 * tìm khối theo mã; sau này gửi theo từng đoạn / ghép bản sửa của 2 người cũng dựa vào mã.
 *
 * Extension `UniqueID` tự cấp mã khối mới, Enter tách đoạn, dán / kéo thả (bỏ mã
 * cũ rồi cấp lại). Lần cấp mã cho note cũ không vào lịch sử undo.
 */

export const BLOCK_KEY_NAME = 'key';
export const BLOCK_KEY_ATTR = `data-${BLOCK_KEY_NAME}`;

const BLOCK_TYPES = [
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
  'horizontalRule',
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const KEY_LENGTH = 8;

/** 8 ký tự ngẫu nhiên (~47 bit). Chỉ cần không trùng trong 1 note; ngắn cho đỡ phình HTML. */
export function newBlockKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(KEY_LENGTH));
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export const NoteBlockKeys = UniqueID.configure({
  attributeName: BLOCK_KEY_NAME,
  types: BLOCK_TYPES,
  generateID: () => newBlockKey(),
});

/** Khối cần tìm: theo mã nếu có, không có mã (note chưa từng mở sửa) thì theo vị trí. */
export interface BlockTarget {
  key: string | null;
  index: number;
}

/**
 * Vị trí khối trong danh sách mã các khối cấp ngoài cùng. -1 = không tìm thấy.
 * Có mã mà không thấy (khối đã bị xoá) → -1, KHÔNG lấy khối khác ở cùng vị trí.
 */
export function findBlockIndex(keys: ReadonlyArray<string | null>, target: BlockTarget): number {
  if (target.key) return keys.indexOf(target.key);
  return target.index >= 0 && target.index < keys.length ? target.index : -1;
}
