import { useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n';
import { usePresence } from '@/lib/motion';
import { hideNotice, useNoticeStore } from '../store/notice-store';

const VISIBLE_MS = 2500;

/**
 * Thông báo ngắn giữa mép trên canvas. Tự ẩn, không chặn chuột.
 * Hiện / ẩn bằng motion `toast` (mép trên); lúc tan giữ chữ của lần cuối.
 */
export function CanvasNotice() {
  const { t } = useI18n();
  const key = useNoticeStore((s) => s.key);
  const seq = useNoticeStore((s) => s.seq);
  const presence = usePresence(key !== null);
  const lastKeyRef = useRef(key);
  if (key) lastKeyRef.current = key;
  const shownKey = key ?? lastKeyRef.current;

  useEffect(() => {
    if (!key) return;
    const timer = setTimeout(hideNotice, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [key, seq]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 top-4 z-toolbar flex justify-center"
    >
      {presence.mounted && shownKey ? (
        <div
          data-motion="toast"
          data-edge="top"
          {...presence.props}
          className="rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md"
        >
          {t(shownKey)}
        </div>
      ) : null}
    </div>
  );
}
