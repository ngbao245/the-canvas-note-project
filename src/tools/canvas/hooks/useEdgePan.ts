import { getCameraEngine } from '../engine/camera-engine';
import { computeContentBounds } from '../lib/content-bounds';
import { hitZone } from '../lib/hit-test';
import { useObjectsStore } from '../store/objects-store';

const EDGE_ZONE = 60; // px từ rìa surface bắt đầu auto-pan
const EDGE_MAX_SPEED = 8; // px/frame ở rìa tuyệt đối

interface EdgePanDeps {
  /** True khi đang thực sự drag object (chưa drag thì loop tự dừng). */
  isDragging: () => boolean;
  /** Toạ độ client cursor mới nhất. */
  getCursor: () => { x: number; y: number };
  /** ID các object đang kéo (loại khỏi bounds check để pan không phụ thuộc chính nó). */
  getDraggingIds: () => string[];
  /** Gọi sau mỗi lần pan để item bám lại cursor (camera đổi → mapping đổi). */
  reposition: () => void;
}

/**
 * Edge auto-pan loop cho drag object (Milanote-style). Khi cursor gần rìa surface
 * (< EDGE_ZONE) và trên vùng canvas trống (không overlay), pan camera theo hướng
 * đó. Chỉ pan trục có content vượt viewport bên phía đó — content fit viewport
 * theo trục nào thì skip pan trục đó.
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
    const dxLeft = cursor.x - rect.left;
    const dxRight = rect.right - cursor.x;
    const dyTop = cursor.y - rect.top;
    const dyBottom = rect.bottom - cursor.y;
    if (dxLeft < EDGE_ZONE) panDx = -((EDGE_ZONE - dxLeft) / EDGE_ZONE) * EDGE_MAX_SPEED;
    else if (dxRight < EDGE_ZONE) panDx = ((EDGE_ZONE - dxRight) / EDGE_ZONE) * EDGE_MAX_SPEED;
    if (dyTop < EDGE_ZONE) panDy = -((EDGE_ZONE - dyTop) / EDGE_ZONE) * EDGE_MAX_SPEED;
    else if (dyBottom < EDGE_ZONE) panDy = ((EDGE_ZONE - dyBottom) / EDGE_ZONE) * EDGE_MAX_SPEED;

    // Chỉ pan trục có content vượt viewport bên phía đó. Loại item đang kéo khỏi
    // bounds check để hành vi không phụ thuộc chính item đang kéo.
    const excludeIds = new Set(deps.getDraggingIds());
    const others = Array.from(useObjectsStore.getState().objects.values()).filter(
      (o) => !excludeIds.has(o.id),
    );
    const bounds = computeContentBounds(others);
    const cam = getCameraEngine().getCamera();
    if (bounds) {
      const contentLeft = bounds.x * cam.zoom + cam.x;
      const contentRight = (bounds.x + bounds.width) * cam.zoom + cam.x;
      const contentTop = bounds.y * cam.zoom + cam.y;
      const contentBottom = (bounds.y + bounds.height) * cam.zoom + cam.y;
      const viewW = rect.width;
      const viewH = rect.height;
      if (panDx < 0 && contentLeft >= 0) panDx = 0;
      if (panDx > 0 && contentRight <= viewW) panDx = 0;
      if (panDy < 0 && contentTop >= 0) panDy = 0;
      if (panDy > 0 && contentBottom <= viewH) panDy = 0;
    } else {
      // Không có content khác → skip pan (chỉ có item đang kéo).
      panDx = 0;
      panDy = 0;
    }

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
