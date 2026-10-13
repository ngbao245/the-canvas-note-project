import type { ObjectTypeDefinition } from '../../hooks/useObjectRegistry';
import type { NoteData } from '../../types';
import { updateObjectData } from '../../engine/actions';
import { useObjectsStore } from '../../store/objects-store';
import { parseNoteData } from '../../lib/note-data';
import { sanitizeNoteHtml } from '../../lib/note-schema';
import { NoteRenderer } from './NoteObject';
import { NoteElementActions, NoteEditingActions } from './NoteToolbar';

/** Định nghĩa loại object Note. Đăng ký ở `objects/index.ts`. */
export const noteType: ObjectTypeDefinition = {
  type: 'note',
  renderer: NoteRenderer,
  // Milanote parity: width 338, height 68 (đo từ DOM Milanote `contain-intrinsic-size:
  // 338px 68px` cho note rỗng). Height auto-grow theo content qua RO trong renderer.
  defaultGeometry: { width: 338, height: 68, rotation: 0, zIndex: 0 },
  defaultData: (): NoteData => ({ body: '<p></p>', color: null, heightMode: 'auto' }),
  label: 'Note',
  showInToolbar: true,
  // Kéo corner đổi cả width + height. Note mới heightMode='auto' → RO grow
  // theo content. Sau khi user kéo corner → chuyển 'fixed', RO ngừng grow,
  // content vượt geometry → clip + fade overlay.
  // Data từ clipboard: chuẩn hoá shape qua parseNoteData rồi lọc body HTML.
  sanitizePastedData: (data) => {
    const parsed = parseNoteData(data);
    return { ...parsed, body: sanitizeNoteHtml(parsed.body) };
  },
  onResizeCommit: (objectId) => {
    // User kéo corner Note (bất kỳ dim) → lock heightMode='fixed'. Milanote
    // parity: sau explicit resize, note giữ user set, không auto grow lại.
    // Đọc data hiện tại qua parseNoteData để giữ body/color/... trong shape
    // chuẩn Zod (schema có default cover trường thiếu).
    const cur = useObjectsStore.getState().objects.get(objectId);
    if (!cur) return;
    const parsed = parseNoteData(cur.data);
    if (parsed.heightMode === 'fixed') return; // đã fixed, skip
    updateObjectData(objectId, { ...parsed, heightMode: 'fixed' });
  },
  // Per-type toolbar tree (Milanote parity): Note có cây chức năng riêng khác
  // Task/Link/Image. Toolbar generic lookup registry, không hard-code Note.
  renderElementActions: (object) => <NoteElementActions object={object} />,
  renderEditingActions: () => <NoteEditingActions />,
};
