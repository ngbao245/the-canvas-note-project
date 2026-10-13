import { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/**
 * TẠM: gỡ khi `canvas-sync` xử lý ngầm (spec `app-offline` US-4, câu chốt 2 = B).
 * Nhãn "Đang offline" để thử offline lúc phát triển. Mọi thứ nằm trong file này,
 * gỡ = xoá file + dòng export ở `index.ts` + 1 dòng gắn trong `App.tsx`.
 */
export function OfflineBadge() {
  const { t } = useI18n();
  const online = useSyncExternalStore(subscribe, getOnline, () => true);
  if (online) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed left-1/2 top-3 z-header flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-warning bg-warning-soft px-3 py-1 text-xs font-medium text-warning shadow-sm backdrop-blur select-none"
    >
      <WifiOff className="h-3.5 w-3.5" aria-hidden />
      {t('COMMON.PWA.OFFLINE')}
    </div>
  );
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

function getOnline(): boolean {
  return navigator.onLine;
}
