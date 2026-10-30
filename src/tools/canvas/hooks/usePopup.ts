import { useCallback, useEffect, useRef, useState } from 'react';
import { useEscapeLayer } from '@/lib/shortcuts';
import { usePresence } from '@/lib/motion';

/**
 * State + đóng tự động cho popup nhỏ ở header (View, Xuất, Trợ giúp, "..." breadcrumb).
 * Đóng khi bấm ra ngoài `ref` hoặc nhấn Esc. Esc ở lớp overlay của bộ điều phối phím:
 * chỉ đóng popup, không lọt xuống canvas (canvas dùng Esc để bỏ chọn).
 *
 * Gắn `ref` vào khối bọc cả nút mở lẫn popup → bấm lại nút không bị tính là
 * "bấm ngoài" (toggle chạy đúng).
 */
export function usePopup<T extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = useState(false);
  const ref = useRef<T>(null);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  // Render popup theo `presence.mounted` (giữ lại lúc tan), Esc + click ngoài theo `open`.
  const presence = usePresence(open);

  useEscapeLayer(close, { enabled: open });

  useEffect(() => {
    if (!open) return;
    // pointerdown (không phải mousedown): canvas preventDefault pointerdown để
    // chọn vùng → trình duyệt không phát mousedown. Capture để handler con
    // stopPropagation cũng không chặn được.
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [open]);

  return { open, ref, close, toggle, presence };
}
