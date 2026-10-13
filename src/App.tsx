// Đăng ký tool vào sổ dùng chung trước mọi thứ khác (xem file đó).
import '@/register-tools';
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { applyUiStyleAttr, useUiStyleStore } from '@/stores/ui-style-store';
import { applyThemeAttr, useResolvedTheme } from '@/stores/theme-store';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { ShortcutsModal } from '@/components/shortcuts/ShortcutsModal';
import { applyLangAttr, useLocaleStore } from '@/lib/i18n';
import { GLOBAL_SHORTCUTS, useShortcutDispatcher, useShortcutLayer } from '@/lib/shortcuts';
import { registerPwa } from '@/lib/pwa';
import { OfflineBadge, UpdateBanner } from '@/components/shared';

// Trang thử nghiệm drawably (phong cách vẽ tay) — lazy load, tách bundle.
const LandingDraw = lazy(() => import('@/experiments/drawably/LandingDraw'));
const CanvasDraw = lazy(() => import('@/experiments/drawably/CanvasDraw'));
const StyleDemo = lazy(() => import('@/routes/StyleDemo'));
const Canvas = lazy(() => import('@/tools/canvas/route'));
// Nút đổi nhanh ngôn ngữ + kiểu bàn phím cho dev. Ở bản build, DEV = false → nhánh bị bỏ,
// file không vào bundle.
const DevQuickSwitch = import.meta.env.DEV ? lazy(() => import('@/dev/DevQuickSwitch')) : null;

export default function App() {
  // Đồng bộ phong cách hiển thị lên <html data-ui-style> khi mount và mỗi lần đổi.
  const uiStyle = useUiStyleStore((s) => s.style);
  useEffect(() => {
    applyUiStyleAttr(uiStyle);
  }, [uiStyle]);

  // Đồng bộ theme thật (đã giải 'system') lên <html data-theme>. Persist localStorage.
  const theme = useResolvedTheme();
  useEffect(() => {
    applyThemeAttr(theme);
  }, [theme]);

  // Đồng bộ ngôn ngữ lên <html lang> để trình đọc màn hình phát âm đúng tiếng.
  const locale = useLocaleStore((s) => s.locale);
  useEffect(() => {
    applyLangAttr(locale);
  }, [locale]);

  // Service worker để mở app khi offline. Chỉ chạy ở bản build (spec `app-offline`).
  useEffect(() => {
    registerPwa();
  }, []);

  // Bộ điều phối phím duy nhất + lớp phím toàn app (lib/shortcuts/global-shortcuts.ts).
  useShortcutDispatcher();
  useShortcutLayer('global', GLOBAL_SHORTCUTS);

  // Chặn browser page zoom qua trackpad pinch (wheel với ctrlKey — convention
  // native trackpad). Global listener trên window, passive:false để preventDefault
  // work. Canvas surface có element listener RIÊNG chạy song song → canvas zoom
  // camera vẫn work bình thường khi active; các route khác (Landing/Reader/etc.)
  // KHÔNG bị browser zoom trang khi user vô tình pinch touchpad.
  //
  // Không đụng keyboard Ctrl+= / Ctrl+- / Ctrl+0 — chỉ canvas route override
  // trong useCanvasKeys, các route khác giữ browser default (user có thể zoom
  // chữ nếu muốn).
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    // Capture phase: chạy TRƯỚC mọi target/bubble listener → preventDefault
    // luôn work bất kể child element có stopPropagation không. VD Toolbar canvas
    // stopPropagation để không kích canvas zoom, nếu attach BUBBLE thì window
    // không nhận được event → browser zoom trang. Capture bypass hoàn toàn.
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', onWheel, { capture: true });
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          {/* Landing ở domain riêng (landing.html + vite.landing.config.ts). App mở thẳng canvas. */}
          <Route path="/" element={<Navigate to="/canvas" replace />} />
          <Route path="/thu/drawably-landing" element={<LandingDraw />} />
          <Route path="/thu/drawably-canvas" element={<CanvasDraw />} />
          <Route path="/thu/style-demo" element={<StyleDemo />} />
          <Route path="/canvas" element={<Canvas />} />
          <Route path="/canvas/:boardId" element={<Canvas />} />
          <Route path="/canvas/:boardId/:slug" element={<Canvas />} />
          <Route path="*" element={<Navigate to="/canvas" replace />} />
        </Routes>
      </Suspense>
      {/* Modal Cài đặt toàn app, mở qua useSettingsModalStore. */}
      <SettingsModal />
      {/* Modal phím tắt, mở qua useShortcutsModalStore (Trợ giúp → Phím tắt, phím /). */}
      <ShortcutsModal />
      {/* Thanh báo "Có bản mới", bấm "Tải lại" mới chạy bản mới. */}
      <UpdateBanner />
      {/* TẠM: gỡ khi `canvas-sync` xử lý ngầm. */}
      <OfflineBadge />
      {DevQuickSwitch && (
        <Suspense fallback={null}>
          <DevQuickSwitch />
        </Suspense>
      )}
    </BrowserRouter>
  );
}
