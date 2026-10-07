import { useEffect } from 'react';
import { useInterfaceStore } from '@/stores/interface-store';
import { useThemeStore } from '@/stores/theme-store';
import { isEditableTarget } from '@/lib/dom';

/**
 * Phím tắt toàn app (mount 1 lần ở App):
 *   Ctrl/Cmd + Shift + < / > → kích thước giao diện nhỏ đi / to lên
 *   Ctrl/Cmd + Shift + D     → đảo dark/light
 *
 * Chạy ở mọi màn: canvas, sidebar, modal Cài đặt, modal khác.
 * Không chạy khi đang gõ chữ: input/textarea (gồm ô tìm kiếm), note, editor Tiptap.
 *
 * Capture phase trên window: các modal/popup chặn phím bằng stopPropagation ở window
 * capture (SettingsModal, AccountMenu, ToolbarPopup...). stopPropagation không chặn
 * listener khác trên cùng window cùng phase → phím tắt ở đây vẫn nhận được.
 *
 * Phím tắt riêng canvas vẫn ở useCanvasKeys. Đừng xử lại 2 phím này ở đó, không thì
 * 1 lần bấm chạy 2 lần (theme đảo về như cũ).
 */
export function useGlobalShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
      if (isEditableTarget(e.target)) return;

      // Nhận cả phím vật lý Comma/Period/KeyD: ký tự < > tuỳ bố cục bàn phím, chữ D tuỳ Caps Lock.
      if (e.key === '<' || e.code === 'Comma') {
        e.preventDefault();
        useInterfaceStore.getState().stepSize(-1);
        return;
      }
      if (e.key === '>' || e.code === 'Period') {
        e.preventDefault();
        useInterfaceStore.getState().stepSize(1);
        return;
      }
      if (e.code === 'KeyD') {
        // Đè Ctrl+Shift+D của trình duyệt (đánh dấu tất cả tab).
        e.preventDefault();
        useThemeStore.getState().toggle();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
}
