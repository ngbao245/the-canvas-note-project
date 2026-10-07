import { useCallback, useEffect, useRef, useState } from 'react';
import { useEscapeLayer } from '@/lib/shortcuts';

/**
 * State + đóng tự động cho popup nhỏ ở header (View, Xuất, "..." breadcrumb).
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

  useEscapeLayer(close, { enabled: open });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return { open, ref, close, toggle };
}
