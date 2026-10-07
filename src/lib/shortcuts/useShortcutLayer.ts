import { useEffect, useRef } from 'react';
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
