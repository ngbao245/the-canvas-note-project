import { Extension } from '@tiptap/react';

/**
 * Phím trong lúc sửa note, khai báo qua keymap của Tiptap thay vì tự gắn `keydown`:
 *   - Esc: lưu + thoát sửa (`onCommit`).
 *   - Ctrl / Cmd + Enter: lưu note này + tạo note mới bên dưới (`onCommitAndNew`).
 *   - Enter vẫn để Tiptap thêm đoạn như cũ.
 *
 * `priority` 1000 > mặc định 100 của HardBreak: keymap ưu tiên cao chạy trước,
 * trả `true` là ProseMirror dừng + preventDefault → Mod-Enter của HardBreak
 * (xuống dòng mềm) không chèn `<br>` trước khi lưu.
 * Đang ghép chữ (Telex, VNI, IME): ProseMirror tự bỏ qua keydown (`view.composing`),
 * không cần kiểm `isImeComposing`.
 * 'Ctrl-Enter' thêm cho Mac (Mod = Cmd), nhận cả Ctrl lẫn Cmd như trước.
 */
export const NoteCommitKeys = Extension.create<{
  onCommit: () => void;
  onCommitAndNew: () => void;
}>({
  name: 'noteCommitKeys',
  priority: 1000,
  addOptions() {
    return { onCommit: () => {}, onCommitAndNew: () => {} };
  },
  addKeyboardShortcuts() {
    const commit = () => {
      this.options.onCommit();
      return true;
    };
    const commitAndNew = () => {
      this.options.onCommitAndNew();
      return true;
    };
    return { Escape: commit, 'Mod-Enter': commitAndNew, 'Ctrl-Enter': commitAndNew };
  },
});
