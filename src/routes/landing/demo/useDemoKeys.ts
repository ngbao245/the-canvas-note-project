import { bindShortcuts, useShortcutLayer } from '@/lib/shortcuts';
import { useDemoStore } from './demo-store';
import { DEMO_SHORTCUT_DEFS } from './demo-shortcuts';

/** Gắn phím canvas mini qua bộ điều phối chung. Chỉ bật khi khung demo đang bật. */
export function useDemoKeys({ active, onRelease }: { active: boolean; onRelease: () => void }) {
  useShortcutLayer(
    'tool',
    bindShortcuts(DEMO_SHORTCUT_DEFS, {
      'demo.undo': { run: () => useDemoStore.getState().undo() },
      'demo.redo': { run: () => useDemoStore.getState().redo() },
      'demo.delete': { run: () => useDemoStore.getState().deleteSelected() },
      'demo.edit': {
        // Enter trên nút / link đang focus (tile Note, Undo, "Mở bản đầy đủ") là bấm
        // nút / mở link, không phải vào sửa.
        when: () => {
          const el = document.activeElement;
          return !(el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement);
        },
        run: () => {
          const { selectedId, startEdit } = useDemoStore.getState();
          if (!selectedId) return false;
          startEdit(selectedId);
        },
      },
      'demo.release': {
        run: () => {
          useDemoStore.getState().select(null);
          onRelease();
        },
      },
    }),
    { enabled: active },
  );
}
