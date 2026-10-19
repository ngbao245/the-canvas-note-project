import type { ObjectTypeDefinition } from '../../hooks/useObjectRegistry';
import type { NoteData } from '../../types';
import { setObjectDataSilently } from '../../engine/actions';
import { useObjectsStore } from '../../store/objects-store';
import { parseNoteData } from '../../lib/note-data';
import { sanitizeNoteHtml } from '../../lib/note-schema';
import { NoteRenderer } from './NoteObject';
import { NoteElementActions, NoteEditingActions } from './NoteToolbar';

/** Định nghĩa loại object Note. Đăng ký ở `objects/index.ts`. */
export const noteType: ObjectTypeDefinition = {
  type: 'note',
  renderer: NoteRenderer,
  // Rộng 300 (bạn chốt 2026-10-15, hẹp hơn 338 của Milanote một chút), cao 68 =
  // note rỗng 1 dòng. Height auto-grow theo content qua RO trong renderer.
  defaultGeometry: { width: 300, height: 68, rotation: 0, zIndex: 0 },
  // Cùng nguồn mặc định với lúc đọc data thiếu trường (lib/note-data).
  defaultData: (): NoteData => parseNoteData(null),
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
  // Cao ≥ 68 (bằng note tự cao 1 dòng): note fixed không dẹt hơn note auto.
  // Rộng ≥ 160 (bạn chốt 2026-10-15): trừ padding 40 còn ~120px cho chữ.
  minSize: { width: 160, height: 68 },
  onResizeCommit: (objectId) => {
    // User kéo corner Note (bất kỳ dim) → lock heightMode='fixed'. Milanote
    // parity: sau explicit resize, note giữ user set, không auto grow lại.
    // Trả extra để gộp vào CÙNG bước undo với resize (Ctrl+Z 1 lần trả cả cỡ
    // lẫn heightMode, không tách 2 bước). Đọc qua parseNoteData giữ shape Zod.
    const cur = useObjectsStore.getState().objects.get(objectId);
    if (!cur) return undefined;
    const parsed = parseNoteData(cur.data);
    if (parsed.heightMode === 'fixed') return undefined; // đã fixed, không đổi data
    const before = { ...parsed };
    const after = { ...parsed, heightMode: 'fixed' as const };
    return {
      apply: () => setObjectDataSilently(objectId, after),
      undo: () => setObjectDataSilently(objectId, before),
      redo: () => setObjectDataSilently(objectId, after),
    };
  },
  // Per-type toolbar tree (Milanote parity): Note có cây chức năng riêng khác
  // Task/Link/Image. Toolbar generic lookup registry, không hard-code Note.
  renderElementActions: (object) => <NoteElementActions object={object} />,
  renderEditingActions: () => <NoteEditingActions />,
};
