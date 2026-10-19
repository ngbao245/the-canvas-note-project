import { getCameraEngine } from '../engine/camera-engine';
import { hitZone } from '../lib/hit-test';

const EDGE_ZONE = 60; // px từ rìa surface bắt đầu auto-pan
const EDGE_MAX_SPEED = 8; // px/frame ở rìa tuyệt đối

interface EdgePanDeps {
  /** True khi đang thực sự drag object (chưa drag thì loop tự dừng). */
  isDragging: () => boolean;
  /** Toạ độ client cursor mới nhất. */
  getCursor: () => { x: number; y: number };
  /** Gọi sau mỗi lần pan để item bám lại cursor (camera đổi → mapping đổi). */
  reposition: () => void;
}

/**
 * Edge auto-pan loop cho drag object (Milanote-style). Khi cursor gần rìa surface
 * (< EDGE_ZONE) và trên vùng canvas trống (không overlay), pan camera theo hướng
 * đó.
 *
 * Không kiểm "phía đó còn object khác" nữa (spec `canvas-pan-bounce`): vùng tài
 * liệu gồm cả object đang kéo, giãn theo từng khung → kéo object ra xa thì màn
 * cuộn theo được. Pan chặn cứng (không kéo lố) nên object vẫn khớp chuột; dừng ở
 * trần an toàn `DOC_COORD_LIMIT`.
 *
 * Tách khỏi useObjectDrag để file drag gọn hơn. Trả về { start, stop } quản lý
 * vòng rAF; caller giữ handle để huỷ khi drag kết thúc.
 */
export function createEdgePanLoop(deps: EdgePanDeps) {
  let rafId: number | null = null;

  const step = () => {
    if (!deps.isDragging()) {
      rafId = null;
      return;
    }
    const surface = document.querySelector('[data-canvas-surface]');
    const cursor = deps.getCursor();
    if (!(surface instanceof HTMLElement)) {
      rafId = requestAnimationFrame(step);
      return;
    }
    // Edge-pan CHỈ chạy khi cursor trực tiếp trên vùng canvas trống (không header,
    // không overlay toolbar/trash) — để user vẫn thả được vào trash.
    if (hitZone(cursor.x, cursor.y) !== 'canvas') {
      rafId = requestAnimationFrame(step);
      return;
    }
    const rect = surface.getBoundingClientRect();
    let panDx = 0;
    let panDy = 0;
    const EDGE_INSET_LEFT = 64; // bề rộng toolbox + khe hở, px màn

    const dxLeft = Math.max(0, cursor.x - (rect.left + EDGE_INSET_LEFT));
    const dxRight = rect.right - cursor.x;
    const dyTop = cursor.y - rect.top;
    const dyBottom = rect.bottom - cursor.y;
    if (dxLeft < EDGE_ZONE) panDx = -((EDGE_ZONE - dxLeft) / EDGE_ZONE) * EDGE_MAX_SPEED;
    else if (dxRight < EDGE_ZONE) panDx = ((EDGE_ZONE - dxRight) / EDGE_ZONE) * EDGE_MAX_SPEED;
    if (dyTop < EDGE_ZONE) panDy = -((EDGE_ZONE - dyTop) / EDGE_ZONE) * EDGE_MAX_SPEED;
    else if (dyBottom < EDGE_ZONE) panDy = ((EDGE_ZONE - dyBottom) / EDGE_ZONE) * EDGE_MAX_SPEED;

    if (panDx !== 0 || panDy !== 0) {
      getCameraEngine().pan({ x: -panDx, y: -panDy });
      deps.reposition();
    }
    rafId = requestAnimationFrame(step);
  };

  return {
    start() {
      if (rafId === null) rafId = requestAnimationFrame(step);
    },
    stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
  };
}
