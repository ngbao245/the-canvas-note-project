import { useInterfaceStore } from '@/stores/interface-store';
import { useThemeStore } from '@/stores/theme-store';
import { useSettingsModalStore } from '@/stores/settings-modal-store';
import { useShortcutsModalStore } from '@/stores/shortcuts-modal-store';
import { bindShortcuts } from './combo';
import type { ShortcutDef } from './types';

/**
 * Phím toàn app (lớp global): chạy ở mọi màn, kể cả khi modal mở.
 * Không chạy khi đang gõ chữ (mặc định của lớp global).
 *
 * < / > nhận cả ký tự lẫn phím vật lý Comma/Period: ký tự tuỳ bố cục bàn phím.
 * Ctrl+Shift+D đè phím "đánh dấu tất cả tab" của trình duyệt.
 * `/` so theo ký tự, `shift: 'any'` vì vài bố cục (VD Đức) phải giữ Shift mới ra `/`.
 */
const APPEARANCE = 'SHORTCUTS.GROUP.APPEARANCE';

export const GLOBAL_SHORTCUT_DEFS = {
  'app.open-shortcuts': {
    combos: [{ shift: 'any', key: '/' }],
    display: {
      groupKey: 'SHORTCUTS.GROUP.NAVIGATION',
      labelKey: 'SHORTCUTS.ACTION.OPEN_SHORTCUTS',
      // Số lớn: luôn đứng cuối nhóm "Thường dùng", sau phím của tool.
      essential: 100,
    },
  },
  'app.toggle-theme': {
    combos: [{ mod: true, shift: true, code: 'KeyD' }],
    display: { groupKey: APPEARANCE, labelKey: 'SHORTCUTS.ACTION.TOGGLE_THEME' },
  },
  'app.size-down': {
    combos: [
      { mod: true, shift: true, key: '<' },
      { mod: true, shift: true, code: 'Comma', alias: true },
    ],
    display: { groupKey: APPEARANCE, labelKey: 'SHORTCUTS.ACTION.SIZE_DOWN' },
  },
  'app.size-up': {
    combos: [
      { mod: true, shift: true, key: '>' },
      { mod: true, shift: true, code: 'Period', alias: true },
    ],
    display: { groupKey: APPEARANCE, labelKey: 'SHORTCUTS.ACTION.SIZE_UP' },
  },
} satisfies Record<string, ShortcutDef>;

export const GLOBAL_SHORTCUTS = bindShortcuts(GLOBAL_SHORTCUT_DEFS, {
  // Bấm lại `/` khi modal đang mở thì đóng. Cài đặt đang mở thì không mở chồng.
  'app.open-shortcuts': {
    when: () => !useSettingsModalStore.getState().open,
    run: () => {
      const modal = useShortcutsModalStore.getState();
      if (modal.open) modal.close();
      else modal.openModal();
    },
  },
  'app.toggle-theme': {
    run: () => {
      useThemeStore.getState().toggle();
    },
  },
  'app.size-down': {
    run: () => {
      useInterfaceStore.getState().stepSize(-1);
    },
  },
  'app.size-up': {
    run: () => {
      useInterfaceStore.getState().stepSize(1);
    },
  },
});
