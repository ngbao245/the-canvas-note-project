import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Trạng thái giao diện bảng dev. Chỉ dev, lưu localStorage máy này. */

export type WriteMetricsMode = 'session' | 'live';

interface DevPanelState {
  collapsed: boolean;
  writeMode: WriteMetricsMode;
  /** Nhãn kịch bản chọn lần cuối, đo tiếp không phải chọn lại. */
  scenario: string;
  setCollapsed: (collapsed: boolean) => void;
  setWriteMode: (mode: WriteMetricsMode) => void;
  setScenario: (scenario: string) => void;
}

export const useDevPanelStore = create<DevPanelState>()(
  persist(
    (set) => ({
      collapsed: false,
      writeMode: 'session',
      scenario: 'A',
      setCollapsed: (collapsed) => set({ collapsed }),
      setWriteMode: (writeMode) => set({ writeMode }),
      setScenario: (scenario) => set({ scenario }),
    }),
    { name: 'bibo-dev-panel' },
  ),
);
