import { create } from 'zustand';

/**
 * Trạng thái mở/đóng modal Cài đặt (toàn app, không persist).
 * Mở từ bất kỳ đâu (popup tài khoản, phím tắt sau này) qua openSettings(section).
 */

export type SettingsSection =
  | 'account'
  | 'notifications'
  | 'appearance'
  | 'localization'
  | 'canvas'
  | 'toolbar'
  | 'shortcuts'
  | 'data';

interface SettingsModalState {
  open: boolean;
  section: SettingsSection;
  openSettings: (section?: SettingsSection) => void;
  setSection: (section: SettingsSection) => void;
  close: () => void;
}

export const useSettingsModalStore = create<SettingsModalState>()((set) => ({
  open: false,
  section: 'appearance',
  openSettings: (section) => set((s) => ({ open: true, section: section ?? s.section })),
  setSection: (section) => set({ section }),
  close: () => set({ open: false }),
}));
