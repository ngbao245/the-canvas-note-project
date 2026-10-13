import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { hideNotice, useNoticeStore } from '../store/notice-store';

const VISIBLE_MS = 2500;

/** Thông báo ngắn giữa mép trên canvas. Tự ẩn, không chặn chuột. */
export function CanvasNotice() {
  const { t } = useI18n();
  const key = useNoticeStore((s) => s.key);
  const seq = useNoticeStore((s) => s.seq);

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
      {key ? (
        <div className="rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md">
          {t(key)}
        </div>
      ) : null}
    </div>
  );
}
