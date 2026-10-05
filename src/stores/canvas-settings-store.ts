import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Setting của Canvas do người dùng chỉnh trong Cài đặt → Canvas.
 * Lưu localStorage key 'bibo-canvas-settings', cả nhóm là 1 object → sau này
 * đồng bộ backend chỉ cần thay chỗ lưu.
 *
 * Hút cạnh / khớp lưới khi thả KHÔNG nằm ở đây: luôn bật (chốt 2026-10-02).
 */

export type ScrollSpeed = 'slow' | 'normal' | 'fast';

/** Hệ số nhân delta wheel khi cuộn canvas. 'normal' = 0.5, giữ như trước khi có setting. */
export const SCROLL_SPEED_FACTOR: Record<ScrollSpeed, number> = {
  slow: 0.3,
  normal: 0.5,
  fast: 0.8,
};

interface CanvasSettings {
  showGrid: boolean;
  scrollSpeed: ScrollSpeed;
}

const DEFAULTS: CanvasSettings = { showGrid: true, scrollSpeed: 'normal' };

interface CanvasSettingsState extends CanvasSettings {
  setShowGrid: (showGrid: boolean) => void;
  setScrollSpeed: (scrollSpeed: ScrollSpeed) => void;
  reset: () => void;
}

export const useCanvasSettingsStore = create<CanvasSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setShowGrid: (showGrid) => set({ showGrid }),
      setScrollSpeed: (scrollSpeed) => set({ scrollSpeed }),
      reset: () => set(DEFAULTS),
    }),
    { name: 'bibo-canvas-settings' },
  ),
);
