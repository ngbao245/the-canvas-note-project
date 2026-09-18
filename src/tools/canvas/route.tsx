import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Frame, RotateCcw, Maximize2, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/stores/theme-store';
import { LoadingState, ErrorState } from '@/components/shared';
import { Badge } from '@/components/style';
import { useObjectsStore } from './store/objects-store';
import { useCameraStore } from './store/camera-store';
import { useCanvasBootstrap } from './hooks/useCanvasBootstrap';
import { useCanvasKeys } from './hooks/useCanvasKeys';
import { computeContentBounds } from './lib/content-bounds';
import { getCameraEngine } from './engine/camera-engine';
import { CanvasApp } from './components/CanvasApp';

/**
 * Canvas route `/canvas`. Bootstrap → LoadingState | ErrorState | CanvasApp.
 * Header: back, tiêu đề, badge object count, zoom %, Fit, Reset, theme toggle.
 * Undo/Redo Ctrl+Z / Ctrl+Shift+Z. Fit/Reset gắn phím F/0. Persist camera do
 * engine tự debounce 500ms — không cần usePersistCamera nữa.
 */
export default function CanvasRoute() {
  const bootstrap = useCanvasBootstrap();
  const objectCount = useObjectsStore((s) => s.objects.size);
  // KHÔNG subscribe zoom ở đây — subscribe ở <ZoomBadge /> con để cô lập
  // re-render 60Hz trong lúc ramp. Nếu subscribe tại route, toàn bộ subtree
  // (CanvasApp → ObjectsLayer → mọi item) re-render mỗi frame → giật cả canvas.
  const resetCamera = useCameraStore((s) => s.reset);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  // Object trên root board lưu boardId=null (khớp loadObjects(null) trong bootstrap).
  // rootBoard.id chỉ dùng cho persist camera, không phải cho boardId của object.
  // Phase D nested boards: truyền board.id thật của board con.
  const boardId = null;

  const handleFit = useCallback(() => {
    const bounds = computeContentBounds(useObjectsStore.getState().objects.values());
    const engine = getCameraEngine();
    const viewport = engine.getViewport();
    if (!bounds) {
      resetCamera();
      return;
    }
    engine.fit(bounds, viewport);
  }, [resetCamera]);

  useCanvasKeys({ onFit: handleFit, onReset: resetCamera });

  if (bootstrap.state.phase === 'error') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <ErrorState
          message={`Không load được canvas: ${bootstrap.state.message}`}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (bootstrap.state.phase === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingState label="Đang tải canvas..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-2">
        <Link
          to="/"
          aria-label="Về trang chủ"
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Frame className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-sm font-semibold">Canvas</h1>
        <Badge tone="default">
          {objectCount} object{objectCount === 1 ? '' : 's'}
        </Badge>

        <div className="ml-auto flex items-center gap-2">
          <ZoomBadge />
          <button
            type="button"
            onClick={handleFit}
            title="Fit content (F)"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Maximize2 className="h-3.5 w-3.5" /> Fit
          </button>
          <button
            type="button"
            onClick={resetCamera}
            title="Reset view (0)"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang light' : 'Chuyển sang dark'}
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Đổi theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <CanvasApp boardId={boardId} />
    </div>
  );
}

/**
 * Isolate zoom subscription. Component nhỏ này re-render 60Hz trong ramp,
 * còn CanvasRoute + CanvasApp không bị đụng → không re-render subtree canvas.
 */
function ZoomBadge() {
  const zoom = useCameraStore((s) => s.camera.zoom);
  return (
    <span className="text-xs tabular-nums text-muted-foreground">
      {Math.round(zoom * 100)}%
    </span>
  );
}
