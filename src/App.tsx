import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Landing from '@/routes/Landing';
import { applyUiStyleAttr, useUiStyleStore } from '@/stores/ui-style-store';

// Trang thử nghiệm drawably (phong cách vẽ tay) — lazy load, tách bundle.
const LandingDraw = lazy(() => import('@/experiments/drawably/LandingDraw'));
const CanvasDraw = lazy(() => import('@/experiments/drawably/CanvasDraw'));
const StyleDemo = lazy(() => import('@/routes/StyleDemo'));

export default function App() {
  // Đồng bộ phong cách hiển thị lên <html data-ui-style> khi mount và mỗi lần đổi.
  const uiStyle = useUiStyleStore((s) => s.style);
  useEffect(() => {
    applyUiStyleAttr(uiStyle);
  }, [uiStyle]);

  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/thu/drawably-landing" element={<LandingDraw />} />
          <Route path="/thu/drawably-canvas" element={<CanvasDraw />} />
          <Route path="/thu/style-demo" element={<StyleDemo />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
