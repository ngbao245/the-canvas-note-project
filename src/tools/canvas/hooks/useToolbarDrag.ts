import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { getCameraEngine } from '../engine/camera-engine';
import { hitZone } from '../lib/hit-test';
import type { DefaultGeometry } from './useObjectRegistry';

/**
 * Pointer-based drag cho toolbar palette (không HTML5 draggable — nuốt click).
 *
 * Cơ chế:
 *   - pointerdown → ghi start, chờ threshold.
 *   - pointermove vượt DRAG_THRESHOLD → START:
 *       + Dựng ghost = renderPreview() với size = defaultGeometry × zoom hiện tại.
 *       + Ghost pop up: scale 0.5 → 1.15 với transition (cảm giác "nhấc lên").
 *   - pointermove tiếp:
 *       + Position ghost follow cursor (grab offset = giữa ghost).
 *       + Detect vùng: overlay (toolbar) → scale 1.15 + cursor default.
 *         Canvas surface → scale 1.0 + cursor default. Ngoài (header/...) → invalid:
 *         scale 0.85, opacity 0.5, cursor 'not-allowed'.
 *   - pointerup:
 *       + Chưa vượt threshold → onClick().
 *       + Drop trên canvas surface → onDrop(x, y).
 *       + Drop trên vùng invalid → cancel, không tạo gì.
 */

const DRAG_THRESHOLD = 5;
const POP_SCALE = 1.15;

export type DropZone = 'canvas' | 'invalid';

// Từ toolbar chỉ tạo object khi thả trên vùng canvas trống. Thả trên overlay
// (toolbar/trash) hoặc ngoài canvas đều tính invalid — khác với drag object đã
// tồn tại (trash mới là valid drop = delete).
function detectZone(clientX: number, clientY: number): DropZone {
  return hitZone(clientX, clientY) === 'canvas' ? 'canvas' : 'invalid';
}

export function useToolbarDrag(opts: {
  onClick: () => void;
  onDrop: (clientX: number, clientY: number) => void;
  defaultGeometry: DefaultGeometry;
  renderPreview?: () => HTMLElement;
  label: string;
}) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const ghostRef = useRef<HTMLElement | null>(null);
  const zoneRef = useRef<DropZone>('invalid');

  const buildGhost = (): HTMLElement => {
    // Ghost size = geometry × camera zoom → user thấy "kích thước thật" object
    // sẽ có trên canvas ở zoom hiện tại. Zoom 100% → full, 40% → 40%.
    const zoom = getCameraEngine().getCamera().zoom;
    const w = opts.defaultGeometry.width * zoom;
    const h = opts.defaultGeometry.height * zoom;

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '0';
    wrapper.style.top = '0';
    wrapper.style.width = `${w}px`;
    wrapper.style.height = `${h}px`;
    wrapper.style.pointerEvents = 'none';
    // Tầng drag-layer (screen-space) — ghost nổi trên toolbar/header + overlay.
    // Khớp UnsortDragPreview. Xem `.kiro/notes/z-index-tiers.md`.
    wrapper.style.zIndex = 'var(--z-drag-layer)';
    wrapper.style.opacity = '0';
    wrapper.style.transformOrigin = 'center center';
    wrapper.style.transform = 'translate3d(-9999px,-9999px,0) scale(0.5)';
    // Chỉ transition opacity/filter — KHÔNG transform. Transform update mỗi
    // frame theo cursor; transition trên transform → ghost lag theo cursor
    // (di sau 120ms). User feedback: bỏ hẳn animation lift, snap instant.
    wrapper.style.transition = 'opacity 120ms, filter 120ms';
    wrapper.style.filter = 'drop-shadow(0 12px 32px rgba(0,0,0,0.35))';

    if (opts.renderPreview) {
      const inner = opts.renderPreview();
      inner.style.width = '100%';
      inner.style.height = '100%';
      wrapper.appendChild(inner);
    } else {
      const fallback = document.createElement('div');
      fallback.textContent = opts.label;
      fallback.className =
        'flex h-full w-full items-center justify-center rounded-md border border-primary bg-card px-3 py-2 text-xs font-medium text-foreground';
      wrapper.appendChild(fallback);
    }
    return wrapper;
  };

  const positionGhost = (x: number, y: number) => {
    const g = ghostRef.current;
    if (!g) return;
    const w = g.offsetWidth;
    const h = g.offsetHeight;
    // Cursor ở giữa ghost.
    const cx = x - w / 2;
    const cy = y - h / 2;
    const zone = zoneRef.current;
    let scale = 1.0;
    let opacity = '0.9';
    if (zone === 'invalid') {
      scale = 0.85;
      opacity = '0.5';
    } else if (zone === 'canvas') {
      scale = 1.0;
    }
    g.style.transform = `translate3d(${cx}px, ${cy}px, 0) scale(${scale})`;
    g.style.opacity = opacity;
  };

  const updateZone = (clientX: number, clientY: number) => {
    const zone = detectZone(clientX, clientY);
    if (zone !== zoneRef.current) {
      zoneRef.current = zone;
      document.body.classList.toggle('canvas-drag-invalid', zone === 'invalid');
    }
  };

  const cleanup = () => {
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }
    document.body.classList.remove('canvas-drag-invalid');
    startRef.current = null;
    draggingRef.current = false;
    zoneRef.current = 'invalid';
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
  };

  const onMove = (e: PointerEvent) => {
    const start = startRef.current;
    if (!start) return;
    if (!draggingRef.current) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      draggingRef.current = true;
      const ghost = buildGhost();
      document.body.appendChild(ghost);
      ghostRef.current = ghost;
      // Force reflow rồi pop-up (scale up + fade in).
      void ghost.offsetHeight;
      updateZone(e.clientX, e.clientY);
      positionGhost(e.clientX, e.clientY);
      // Pop animation: start scale 0.5, expand tới POP_SCALE, rồi giảm về 1.0.
      // Vì zone ban đầu chắc trên overlay (toolbar), scale = POP_SCALE là ổn.
      ghost.style.opacity = zoneRef.current === 'invalid' ? '0.5' : '0.9';
      const w = ghost.offsetWidth;
      const h = ghost.offsetHeight;
      ghost.style.transform = `translate3d(${e.clientX - w / 2}px, ${e.clientY - h / 2}px, 0) scale(${POP_SCALE})`;
      return;
    }
    updateZone(e.clientX, e.clientY);
    positionGhost(e.clientX, e.clientY);
  };

  const onUp = (e: PointerEvent) => {
    const wasDragging = draggingRef.current;
    const zone = zoneRef.current;
    const x = e.clientX;
    const y = e.clientY;
    cleanup();
    if (!wasDragging) {
      opts.onClick();
      return;
    }
    if (zone === 'canvas') opts.onDrop(x, y);
    // zone === 'invalid' → cancel, không làm gì.
  };

  const onCancel = () => cleanup();

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    startRef.current = { x: e.clientX, y: e.clientY };
    draggingRef.current = false;
    zoneRef.current = 'invalid';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  return { onPointerDown };
}
