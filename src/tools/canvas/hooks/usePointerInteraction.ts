import { useEffect, type RefObject } from 'react';
import { useSelectionStore } from '../store/selection-store';
import { useObjectsStore } from '../store/objects-store';
import { useInteractionStore } from '../store/interaction-store';
import { getCameraEngine } from '../engine/camera-engine';
import { screenToCanvas, aabbIntersect } from '../engine/coord';
import {
  bindShortcuts,
  isMacSecondaryClick,
  isPrimaryModifier,
  registerLayer,
} from '@/lib/shortcuts';
import { setCursorOverride } from '@/lib/cursor-override';
import { CANVAS_SHORTCUT_DEFS } from '../shortcuts';

/**
 * Pointer interaction trên canvas surface. Object tự xử pointerdown trong
 * ObjectsLayer (stopPropagation). Surface xử:
 *   - Pan: Space+drag, middle mouse, Ctrl/Cmd+drag → engine.pan (immediate, 1:1)
 *   - Marquee select: drag vùng trống (không modifier)
 *   - Click vùng trống (không drag) → clear selection
 */
export function usePointerInteraction(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let spacePressed = false;
    let panStart: { x: number; y: number } | null = null;
    let marqueeStart: { x: number; y: number; shift: boolean } | null = null;

    // Space giữ để kéo màn hình. Thả phím, mất focus cửa sổ hoặc unmount → release.
    // Con trỏ `grab` đè toàn trang: Space + kéo bắt đầu được ở bất kỳ đâu.
    const panShortcuts = bindShortcuts(CANVAS_SHORTCUT_DEFS, {
      'canvas.pan': {
        run: () => {
          spacePressed = true;
          if (!panStart) setCursorOverride('grab');
        },
        release: () => {
          spacePressed = false;
          if (!panStart) setCursorOverride(null);
        },
      },
    });
    const unregisterPan = registerLayer('tool', () => panShortcuts);

    // --- Kéo màn: nghe ở window, con trỏ ra header / Khay chờ / bảng dev vẫn kéo tiếp ---
    let panMoved = false;
    const onPanMove = (e: PointerEvent) => {
      if (!panStart) return;
      // Không còn nút nào giữ mà vẫn đang kéo = mất pointerup (Alt+Tab, hộp thoại
      // hệ thống lúc đang giữ chuột) → kết thúc, không cho màn chạy theo chuột rê.
      if (e.buttons === 0) {
        endPan();
        return;
      }
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      if (dx !== 0 || dy !== 0) panMoved = true;
      panStart = { x: e.clientX, y: e.clientY };
      // 1:1 theo tay trong phạm vi, tới rìa thì kéo lố (nặng dần, có trần).
      getCameraEngine().panElastic({ x: dx, y: dy });
    };
    const endPan = () => {
      if (!panStart) return;
      panStart = null;
      // Đang lố thì trượt về rìa.
      getCameraEngine().endPointerPan();
      window.removeEventListener('pointermove', onPanMove);
      window.removeEventListener('pointerup', endPan);
      window.removeEventListener('pointercancel', endPan);
      window.removeEventListener('blur', endPan);
      useInteractionStore.getState().setMode('idle');
      setCursorOverride(spacePressed ? 'grab' : null);
      // Bấm bắt đầu kéo trên 1 nút / link (header, Khay chờ, link trong note) rồi thả
      // cũng trên đó → trình duyệt vẫn bắn click (nút trái) hoặc auxclick (chuột
      // giữa: link mở tab mới). Nuốt cả 2 ngay sau lần kéo có di chuyển.
      if (panMoved) {
        const swallow = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        for (const type of ['click', 'auxclick'] as const) {
          window.addEventListener(type, swallow, { capture: true, once: true });
          setTimeout(() => window.removeEventListener(type, swallow, { capture: true }), 0);
        }
      }
    };
    const startPan = (e: PointerEvent) => {
      e.preventDefault();
      panStart = { x: e.clientX, y: e.clientY };
      panMoved = false;
      useInteractionStore.getState().setMode('panning');
      // Toàn trang: lúc pan chuột có thể lướt qua object (cursor-move) hoặc ra header.
      setCursorOverride('grabbing');
      window.addEventListener('pointermove', onPanMove);
      window.addEventListener('pointerup', endPan);
      window.addEventListener('pointercancel', endPan);
      // Mất focus cửa sổ giữa lúc kéo → pointerup có thể không về.
      window.addEventListener('blur', endPan);
    };

    // Space + kéo, chuột giữa: bắt đầu ở bất kỳ đâu trên trang (object, toolbar,
    // header, Khay chờ, bảng dev). Bắt ở capture của window để chạy trước handler
    // React của object / nút, rồi chặn luôn (không chọn, không kéo object).
    // Bỏ qua dialog (ConfirmDialog, Cài đặt) và ô đang gõ chữ.
    const onWindowPointerDown = (e: PointerEvent) => {
      if (panStart) return;
      if (!(spacePressed || e.button === 1)) return;
      if (isMacSecondaryClick(e)) return;
      const t = e.target;
      if (
        t instanceof Element &&
        t.closest('[role="dialog"], [role="alertdialog"], input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }
      e.stopPropagation();
      startPan(e);
    };
    window.addEventListener('pointerdown', onWindowPointerDown, { capture: true });

    const onPointerDown = (e: PointerEvent) => {
      if (panStart) return;
      const onObject =
        e.target instanceof Element && e.target.closest('[data-object-id]') !== null;
      // Ctrl+kéo (Cmd trên macOS) = kéo màn, kể cả bắt đầu trên object (object để
      // sự kiện Ctrl nổi lên, tự lo Ctrl+click không di chuyển = chọn thêm).
      if (
        e.button === 0 &&
        isPrimaryModifier(e) &&
        !isMacSecondaryClick(e) &&
        !useInteractionStore.getState().editingId &&
        !(e.target instanceof Element && e.target.closest('[data-canvas-overlay]'))
      ) {
        startPan(e);
        return;
      }
      // Bỏ qua nếu pointerdown xuất phát từ object hoặc overlay screen-space
      // (toolbar palette, pill...). React synthetic stopPropagation KHÔNG chặn
      // được native listener này (surface nằm giữa target và React root), nên
      // phải guard bằng target — nếu không, kéo object sẽ chạy song song marquee.
      if (
        onObject ||
        (e.target instanceof Element && e.target.closest('[data-canvas-overlay]'))
      ) {
        return;
      }

      // Đang edit inline: KHÔNG preventDefault, KHÔNG setPointerCapture, KHÔNG
      // set editingId. Cho browser tự blur editor → editor.onBlur fire →
      // commitAndClose commit body + setEditingId(null). Đây là path đã proven
      // (giống click header thoát edit). Skip marquee/pan cho pointerdown này —
      // user chỉ "click ngoài để thoát". Muốn marquee thì release rồi kéo lại.
      // Click vùng trống = về canvas hẳn (Milanote): thoát sửa VÀ bỏ chọn. Khác Esc /
      // nút Dismiss (thoát 2 tầng: sửa → chọn → bỏ chọn).
      if (useInteractionStore.getState().editingId) {
        useSelectionStore.getState().clear();
        return;
      }

      // macOS Ctrl+click = chuột phải: không pan, không marquee, để context menu mở.
      if (isMacSecondaryClick(e)) return;

      if (e.button === 0) {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        const rect = el.getBoundingClientRect();
        marqueeStart = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          shift: e.shiftKey,
        };
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (marqueeStart) {
        const rect = el.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const x = Math.min(marqueeStart.x, cx);
        const y = Math.min(marqueeStart.y, cy);
        const w = Math.abs(cx - marqueeStart.x);
        const h = Math.abs(cy - marqueeStart.y);
        if (w > 3 || h > 3) {
          useInteractionStore.getState().setMode('marquee');
          useInteractionStore.getState().setMarqueeRect({ x, y, width: w, height: h });
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (marqueeStart) {
        el.releasePointerCapture(e.pointerId);
        const inter = useInteractionStore.getState();
        const rect = inter.marqueeRect;

        if (rect && inter.mode === 'marquee') {
          const camera = getCameraEngine().getCamera();
          const p1 = screenToCanvas({ x: rect.x, y: rect.y }, camera);
          const p2 = screenToCanvas({ x: rect.x + rect.width, y: rect.y + rect.height }, camera);
          const canvasRect = {
            x: Math.min(p1.x, p2.x),
            y: Math.min(p1.y, p2.y),
            width: Math.abs(p2.x - p1.x),
            height: Math.abs(p2.y - p1.y),
          };
          const hits: string[] = [];
          for (const [id, obj] of useObjectsStore.getState().objects) {
            // Skip Unsort items — chúng KHÔNG render trên canvas nhưng geometry
            // vẫn giữ trong store (x/y cũ hoặc default). Nếu marquee rectangle
            // bao (0,0) hoặc điểm khác trùng geometry, Unsort item sẽ bị "hit"
            // ngoài ý muốn → selection leak sang panel, all items bị select.
            // Marquee canvas chỉ chọn item hiển thị trên canvas (unsortIndex null).
            if (obj.unsortIndex !== null) continue;
            if (aabbIntersect(canvasRect, obj.geometry)) hits.push(id);
          }
          if (marqueeStart.shift) useSelectionStore.getState().addToSelection(hits);
          else useSelectionStore.getState().replace(hits);
        } else {
          if (!marqueeStart.shift) useSelectionStore.getState().clear();
        }

        inter.setMode('idle');
        inter.setMarqueeRect(null);
        marqueeStart = null;
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);

    return () => {
      unregisterPan();
      endPan();
      if (spacePressed) setCursorOverride(null);
      window.removeEventListener('pointerdown', onWindowPointerDown, { capture: true });
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, [ref]);
}
