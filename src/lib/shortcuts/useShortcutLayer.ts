import { useEffect, useRef, type RefObject } from 'react';
import { trapTab } from '@/lib/dom';
import { installShortcutDispatcher, registerLayer } from './dispatcher';
import type { KeyCombo, Shortcut, ShortcutLayerKind } from './types';

/** Gắn bộ điều phối phím. Gọi đúng 1 lần ở App. */
export function useShortcutDispatcher(): void {
  useEffect(() => installShortcutDispatcher(), []);
}

/**
 * Đăng ký 1 lớp phím khi mount (hoặc khi `enabled` bật), gỡ khi unmount / tắt.
 *
 * `shortcuts` có thể là mảng tạo mới mỗi render: lớp đọc bản mới nhất qua ref,
 * không gỡ/gắn lại → giữ nguyên vị trí trong ngăn xếp overlay.
 */
export function useShortcutLayer(
  kind: ShortcutLayerKind,
  shortcuts: readonly Shortcut[],
  { enabled = true, blocking = false }: { enabled?: boolean; blocking?: boolean } = {},
): void {
  const ref = useRef(shortcuts);
  ref.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;
    return registerLayer(kind, () => ref.current, blocking);
  }, [enabled, kind, blocking]);
}

export const ESCAPE_COMBO: KeyCombo = { shift: 'any', key: 'Escape' };

/**
 * Lớp overlay chỉ có Esc (popup, menu). Esc chạy cả khi đang gõ trong popup, được
 * consume → không lọt xuống canvas (bỏ chọn) hay editor (thoát edit).
 */
export function useEscapeLayer(
  onEscape: () => void,
  options?: { enabled?: boolean; blocking?: boolean },
): void {
  useShortcutLayer(
    'overlay',
    [
      {
        id: 'overlay.escape',
        combos: [ESCAPE_COMBO],
        run: () => {
          onEscape();
        },
      },
    ],
    options,
  );
}

/**
 * Lớp overlay chặn cho modal: Esc gọi `onEscape`, Tab / Shift+Tab xoay vòng trong `rootRef`.
 * Phím lớp dưới (canvas) không chạy ngầm sau modal; lớp global vẫn chạy.
 */
export function useModalLayer(
  onEscape: () => void,
  rootRef: RefObject<HTMLElement | null>,
  { enabled = true }: { enabled?: boolean } = {},
): void {
  useShortcutLayer(
    'overlay',
    [
      {
        id: 'modal.escape',
        combos: [ESCAPE_COMBO],
        run: () => {
          onEscape();
        },
      },
      // Không consume: trapTab tự preventDefault khi cần xoay vòng, còn lại Tab đi bình thường.
      {
        id: 'modal.trap-tab',
        combos: [{ shift: 'any', key: 'Tab' }],
        consume: false,
        run: (e) => {
          trapTab(e, rootRef.current);
        },
      },
    ],
    { enabled, blocking: true },
  );
}
