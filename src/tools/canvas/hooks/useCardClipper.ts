import { useEffect, useState, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import { BLOCK_KEY_NAME } from '../lib/note-block-keys';

export interface ClipperTarget {
  /** Vị trí khối (dùng khi note cũ chưa có mã). */
  index: number;
  /** Mã khối `data-key` (spec canvas-note-block-keys). null = note chưa có mã. */
  key: string | null;
  /** Y của nút trong wrapper, px layout (chưa nhân zoom). */
  top: number;
}

/** h-6 của CardClipperButton. */
const BUTTON_SIZE = 24;

/**
 * Khối đang có con trỏ gõ (Milanote: chỉ hiện Card Clipper lúc sửa, ngang khối
 * đang gõ; sửa dòng nào thì kéo dòng đó). Tính lại mỗi transaction (gõ, đổi chỗ
 * con trỏ, Enter) nên nút đi theo con trỏ và theo chiều cao khối.
 *
 * Vị trí đo bằng getBoundingClientRect (px màn hình, đã nhân zoom camera) rồi
 * chia tỉ lệ wrapper để ra px layout: nút nằm trong world đã scale.
 */
export function useCardClipper(
  editor: Editor | null,
  wrapperRef: RefObject<HTMLElement | null>,
): ClipperTarget | null {
  const [state, setState] = useState<ClipperTarget | null>(null);

  useEffect(() => {
    if (!editor) return;

    const compute = () => {
      const wrapper = wrapperRef.current;
      const { $from } = editor.state.selection;
      // Chọn cả note (Ctrl+A) hoặc con trỏ không trong khối nào → không có nút.
      if (!wrapper || $from.depth < 1) {
        setState(null);
        return;
      }
      const index = $from.index(0);
      const node = editor.state.doc.child(index);
      const dom = editor.view.nodeDOM($from.before(1));
      if (!(dom instanceof HTMLElement)) {
        setState(null);
        return;
      }
      const wr = wrapper.getBoundingClientRect();
      const scale = wrapper.offsetHeight > 0 ? wr.height / wrapper.offsetHeight : 1;
      const r = dom.getBoundingClientRect();
      const top = (r.top - wr.top) / scale + r.height / scale / 2 - BUTTON_SIZE / 2;
      const raw: unknown = node.attrs[BLOCK_KEY_NAME];
      const key = typeof raw === 'string' && raw !== '' ? raw : null;
      setState((prev) => {
        if (prev && prev.index === index && prev.key === key && Math.abs(prev.top - top) < 1) return prev;
        return { index, key, top };
      });
    };

    compute();
    editor.on('transaction', compute);
    return () => {
      editor.off('transaction', compute);
    };
  }, [editor, wrapperRef]);

  return state;
}
