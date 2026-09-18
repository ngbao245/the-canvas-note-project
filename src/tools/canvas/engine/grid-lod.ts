/**
 * Grid LOD (level of detail) — pure math cho canvas grid 2-layer cross-fade.
 * Tách khỏi CameraEngine để chỉ giữ trách nhiệm compute (không đụng DOM).
 *
 * Target: screen-space dot spacing luôn nằm trong [BASE, 2×BASE] px, không đổi
 * theo zoom (Milanote/Figma feel — dot không dày đặc khi zoom out, không thưa
 * khi zoom in).
 *
 * Math:
 *   t = log2(1/zoom), level = floor(t), frac = t - level.
 *   Dense doc-size  = BASE × 2^level      → screen = BASE / 2^frac ∈ [BASE/2, BASE]
 *   Sparse doc-size = BASE × 2^(level+1)  → screen = 2×BASE / 2^frac ∈ [BASE, 2×BASE]
 *
 *   Cross-fade giữa 2 layer theo frac:
 *     frac=0: dense opacity 1, sparse 0 → thấy dense ở BASE px (perfect).
 *     frac→1: dense fade out (đang trở nên quá dense), sparse fade in.
 *     Khi frac=1 = level+1 mới, dense mới = sparse cũ. Chuyển band mượt.
 *
 *   Fade extremes: zoom < 0.15 → toàn bộ grid fade về 0 (overview sạch).
 *   Zoom in KHÔNG fade — user zoom in xem chi tiết, dot luôn hữu ích.
 */

/** Base dot spacing (px screen) mục tiêu của band chính. */
export const GRID_BASE = 32;

export interface GridLayer {
  /** Doc-size (px world) cho backgroundSize. */
  docSize: number;
  /** Screen-size (px viewport) cho backgroundSize. */
  screenSize: number;
  /** Offset X đã modulo (px viewport) cho backgroundPosition. */
  posX: number;
  /** Offset Y đã modulo (px viewport) cho backgroundPosition. */
  posY: number;
  /** Opacity trong khoảng [0, 1]. */
  opacity: number;
}

export interface GridLod {
  dense: GridLayer;
  sparse: GridLayer;
}

/**
 * Compute 2 layer grid (dense + sparse) tại camera state hiện tại. Caller apply
 * kết quả xuống DOM (backgroundSize / backgroundPosition / opacity).
 */
export function computeGridLod(camera: { x: number; y: number; zoom: number }, base = GRID_BASE): GridLod {
  const { x, y, zoom } = camera;
  const t = Math.log2(1 / zoom);
  const level = Math.floor(t);
  const frac = t - level;

  const denseDoc = base * Math.pow(2, level);
  const sparseDoc = base * Math.pow(2, level + 1);
  const denseScreen = denseDoc * zoom;
  const sparseScreen = sparseDoc * zoom;

  // Chỉ fade khi zoom out cực. Zoom in không fade.
  let extremeMul = 1;
  if (zoom < 0.2) extremeMul = Math.max(0, (zoom - 0.15) / 0.05);

  return {
    dense: {
      docSize: denseDoc,
      screenSize: denseScreen,
      posX: ((x % denseScreen) + denseScreen) % denseScreen,
      posY: ((y % denseScreen) + denseScreen) % denseScreen,
      opacity: (1 - frac) * extremeMul,
    },
    sparse: {
      docSize: sparseDoc,
      screenSize: sparseScreen,
      posX: ((x % sparseScreen) + sparseScreen) % sparseScreen,
      posY: ((y % sparseScreen) + sparseScreen) % sparseScreen,
      opacity: frac * extremeMul,
    },
  };
}
