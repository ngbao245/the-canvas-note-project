import { useEffect } from 'react';
import { applyThemeAttr } from '@/stores/theme-store';
import { applyLangAttr, useLocaleStore } from '@/lib/i18n';
import { useShortcutDispatcher } from '@/lib/shortcuts';
import LandingPage from './LandingPage';

/**
 * Gốc của bản build landing: không router, không TanStack Query, không đụng dữ liệu canvas.
 * Theme luôn sáng: giấy ký họa sáng, khung thử tối ở giữa trông lạc.
 */
export function LandingRoot() {
  const locale = useLocaleStore((s) => s.locale);
  useEffect(() => {
    applyLangAttr(locale);
  }, [locale]);
  useEffect(() => {
    applyThemeAttr('light');
  }, []);
  // Phím của canvas thử đi qua bộ điều phối chung.
  useShortcutDispatcher();
  return <LandingPage />;
}
