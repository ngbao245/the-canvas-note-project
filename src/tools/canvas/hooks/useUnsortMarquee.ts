import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useSelectionStore } from '../store/selection-store';
import { useUnsortStore } from '../store/unsort-store';

/**
 * Marquee drag select trong Unsort panel. User kéo chuột từ vùng trống (không
 * phải item) → vẽ khung nét đứt → mọi item có bounding rect intersect khung
 * được chọn.
 *
 *   - Ctrl held khi bắt đầu → merge với selection cũ (addToSelection).
 *   - Không Ctrl → replace selection.
 *   - Kéo dưới 4px + release → treat như click empty area → clear selection.
 *
 * Threshold: 4px trước khi bắt đầu vẽ marquee, để click nhẹ không nhảy vào
 * marquee mode.
 */
const DRAG_THRESHOLD = 4;

export interface MarqueeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function useUnsortMarquee(containerRef: React.RefObject<HTMLDivElement>) {
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const stateRef = useRef<{
    startX: number;
    startY: number;
    additive: boolean;
    baseSelection: Set<string>;
    started: boolean;
  } | null>(null);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const target = e.target;
    if (!(target instanceof Element)) return;
    // Bỏ qua nếu click vào item, button, hoặc phần tử tương tác khác.
    if (target.closest('[data-unsort-item-id]')) return;
    if (target.closest('button, a, input, textarea, [role="button"]')) return;

    const additive = e.ctrlKey || e.metaKey || e.shiftKey;
    const baseSelection = additive
      ? new Set(useSelectionStore.getState().selectedIds)
      : new Set<string>();

    stateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      additive,
      baseSelection,
      started: false,
    };

    const onMove = (ev: PointerEvent) => {
      const s = stateRef.current;
      if (!s) return;
      const dx = ev.clientX - s.startX;
      const dy = ev.clientY - s.startY;
      if (!s.started && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      s.started = true;

      // Khung marquee position relative to viewport (dùng fixed div).
      const left = Math.min(s.startX, ev.clientX);
      const top = Math.min(s.startY, ev.clientY);
      const width = Math.abs(dx);
      const height = Math.abs(dy);
      setMarquee({ left, top, width, height });

      // Intersect với từng item DOM. Nếu list rỗng, container null → skip.
      const container = containerRef.current;
      const items = container
        ? container.querySelectorAll<HTMLElement>('[data-unsort-item-id]')
        : [];
      const hit: string[] = [];
      const mLeft = left;
      const mRight = left + width;
      const mTop = top;
      const mBottom = top + height;
      items.forEach((el) => {
        const id = el.getAttribute('data-unsort-item-id');
        if (!id) return;
        const r = el.getBoundingClientRect();
        const intersect =
          r.right >= mLeft && r.left <= mRight && r.bottom >= mTop && r.top <= mBottom;
        if (intersect) hit.push(id);
      });

      const next = new Set(s.baseSelection);
      for (const id of hit) next.add(id);
      useSelectionStore.getState().replace(Array.from(next));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const s = stateRef.current;
      stateRef.current = null;
      setMarquee(null);
      if (!s) return;
      if (!s.started) {
        // Click empty area không kéo đủ threshold → clear selection (nếu
        // không giữ Ctrl/Shift, khi giữ thì giữ nguyên).
        if (!s.additive) useSelectionStore.getState().clear();
      }
      // Reset anchor về null vì selection giờ là 1 nhóm không rõ item nào là
      // "primary". Shift+click sau đó sẽ set anchor mới.
      useUnsortStore.getState().setLastSelectedIndex(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [containerRef]);

  return { marquee, onPointerDown };
}
