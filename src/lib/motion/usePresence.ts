import { useCallback, useEffect, useState, type AnimationEvent } from 'react';

export type PresenceState = 'open' | 'closed';

/** Thuộc tính spread lên phần tử mang `data-motion` (phần tử chạy keyframes thoát). */
export interface PresenceProps {
  'data-state': PresenceState;
  /** Đang tan thì ẩn khỏi trình đọc màn hình. */
  'aria-hidden': true | undefined;
  onAnimationEnd: (e: AnimationEvent<HTMLElement>) => void;
}

export interface Presence {
  /** Có render phần tử không. Vẫn `true` trong lúc chạy hiệu ứng thoát. */
  mounted: boolean;
  state: PresenceState;
  props: PresenceProps;
}

/**
 * Dự phòng khi `animationend` không đến (tab ẩn, phần tử không có animation).
 * Lớn hơn mọi thời gian thoát trong motion.css, không phải nhịp chuyển động.
 */
const EXIT_FALLBACK_MS = 400;

/**
 * Giữ phần tử trong trang tới khi hiệu ứng thoát chạy xong (spec motion-system).
 *
 *   const presence = usePresence(open);
 *   {presence.mounted && <div data-motion="dropdown" {...presence.props}>...</div>}
 *
 * Luật lifecycle: lớp phím (Esc, chặn phím), click ngoài, trả focus vẫn theo `open`
 * (gỡ ngay khi bắt đầu đóng), KHÔNG theo `mounted`. Phần tử đang tan không nhận
 * click nhờ CSS `[data-state='closed']`. Đang tan mà mở lại → về "open", keyframes
 * vào chạy lại.
 */
export function usePresence(open: boolean): Presence {
  const [present, setPresent] = useState(open);
  // Mở là render ngay trong cùng lần render, không chờ effect (không trễ 1 frame).
  const mounted = open || present;

  useEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    if (!present) return;
    const timer = setTimeout(() => setPresent(false), EXIT_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [open, present]);

  const onAnimationEnd = useCallback(
    (e: AnimationEvent<HTMLElement>) => {
      // Bỏ sự kiện nổi lên từ con (spinner, skeleton bên trong).
      if (e.target !== e.currentTarget) return;
      if (!open) setPresent(false);
    },
    [open],
  );

  const state: PresenceState = open ? 'open' : 'closed';
  return {
    mounted,
    state,
    props: { 'data-state': state, 'aria-hidden': open ? undefined : true, onAnimationEnd },
  };
}
