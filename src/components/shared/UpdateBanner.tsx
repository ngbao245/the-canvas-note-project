import { RefreshCw, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { FOCUS_RING } from '@/lib/focus-ring';
import { applyUpdate, dismissUpdate, usePwaStore } from '@/lib/pwa';

/**
 * Thanh báo "Có bản mới" (spec `app-offline`, câu chốt 1 = A).
 * Hiện khi service worker mới đã tải xong và đang chờ. Không tự tải lại.
 * `role="status"` để trình đọc màn hình đọc ra khi thanh xuất hiện.
 */
export function UpdateBanner() {
  const { t } = useI18n();
  const visible = usePwaStore((s) => s.needRefresh);
  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-header flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-popover py-2 pl-4 pr-2 text-sm text-popover-foreground shadow-lg"
    >
      <span>{t('COMMON.PWA.UPDATE_READY')}</span>
      <button
        type="button"
        onClick={applyUpdate}
        className={`inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground transition-colors duration-normal ease-standard hover:bg-primary-hover ${FOCUS_RING}`}
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        {t('COMMON.PWA.RELOAD')}
      </button>
      <button
        type="button"
        onClick={dismissUpdate}
        aria-label={t('COMMON.PWA.DISMISS')}
        title={t('COMMON.PWA.DISMISS')}
        className={`rounded-md p-1.5 text-muted-foreground transition-colors duration-normal ease-standard hover:bg-muted hover:text-foreground ${FOCUS_RING}`}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
