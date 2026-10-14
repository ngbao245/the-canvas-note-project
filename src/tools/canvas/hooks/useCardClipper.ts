import { useEffect, useState, type RefObject } from 'react';
import { BLOCK_KEY_ATTR } from '../lib/note-block-keys';

export interface ClipperHover {
  /** Vị trí khối (dùng khi note cũ chưa có mã). */
  index: number;
  /** Mã khối `data-key` (spec canvas-note-block-keys). null = note chưa có mã. */
  key: string | null;
  top: number;
}

/**
 * Hover detection cho CardClipper (Milanote parity). Trả về khối đang hover
 * (mã + vị trí) + Y position để CardClipperButton render đúng chỗ.
 *
 * `wrapperRef` — outer wrapper của Note (chứa cả padding + content root).
 * `contentRootRef` — element chứa top-level block children (p, h1, ul, ...).
 *   View mode: div dangerouslySetInnerHTML.
 *   Editor mode: Tiptap ProseMirror div (`editor.view.dom`).
 *
 * Chọn wrapperRef làm event target vì:
 *   - Pointer trong padding (giữa content và edge card) không match paragraph
 *     nhưng không nên reset state → giữ button visible.
 *   - Pointer trên CardClipperButton (child của wrapper) trigger pointermove
 *     nhưng target là button → guard bằng attribute check để không reset.
 *
 * State null khi cursor rời wrapper hoàn toàn (pointerleave wrapper).
 */
export function useCardClipper(
  wrapperRef: RefObject<HTMLElement | null>,
  contentRootRef: RefObject<HTMLElement | null>,
): ClipperHover | null {
  const [state, setState] = useState<ClipperHover | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const onMove = (e: PointerEvent) => {
      const root = contentRootRef.current;
      if (!root) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!(target instanceof Element)) return;
      // Nếu hover trên button hoặc descendant → giữ state hiện tại.
      if (target.closest('[data-card-clipper-button]')) return;

      // Tìm block-level ancestor mà parentElement === root (direct child).
      let cur: Element | null = target;
      while (cur && cur.parentElement !== root) {
        cur = cur.parentElement;
      }
      if (!cur || !(cur instanceof HTMLElement)) {
        // Trong wrapper nhưng không trên paragraph nào (VD padding) → chỉ clear
        // state nếu cursor không trong content root nữa.
        if (!root.contains(target)) setState(null);
        return;
      }

      const index = Array.from(root.children).indexOf(cur);
      if (index < 0) {
        setState(null);
        return;
      }

      // Y position relative to wrapper (button absolute trong wrapper).
      const wrapperRect = wrapper.getBoundingClientRect();
      const paraRect = cur.getBoundingClientRect();
      const buttonSize = 24; // h-6 w-6
      const top = paraRect.top - wrapperRect.top + paraRect.height / 2 - buttonSize / 2;

      const key = cur.getAttribute(BLOCK_KEY_ATTR);
      setState((prev) => {
        if (prev && prev.index === index && prev.key === key && Math.abs(prev.top - top) < 1) return prev;
        return { index, key, top };
      });
    };

    const onLeave = () => setState(null);

    wrapper.addEventListener('pointermove', onMove);
    wrapper.addEventListener('pointerleave', onLeave);
    return () => {
      wrapper.removeEventListener('pointermove', onMove);
      wrapper.removeEventListener('pointerleave', onLeave);
    };
  }, [wrapperRef, contentRootRef]);

  return state;
}
