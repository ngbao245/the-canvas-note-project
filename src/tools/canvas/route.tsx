import { useCallback } from 'react';
import { LoadingState, ErrorState } from '@/components/shared';
import { useObjectsStore } from './store/objects-store';
import { useCameraStore } from './store/camera-store';
import { useCanvasBootstrap } from './hooks/useCanvasBootstrap';
import { useCanvasKeys } from './hooks/useCanvasKeys';
import { computeContentBounds } from './lib/content-bounds';
import { getCameraEngine } from './engine/camera-engine';
import { CanvasApp } from './components/CanvasApp';
import { CanvasHeader } from './components/CanvasHeader';

/**
 * Canvas route `/canvas`. Bootstrap → LoadingState | ErrorState | (Header + App).
 *
 * Header 2 row tách sang CanvasHeader. Route chỉ lo: bootstrap state, xử fit/reset
 * (chia sẻ giữa phím tắt F/0 và View menu), rồi ráp layout.
 *
 * Undo/Redo Ctrl+Z / Ctrl+Shift+Z, Fit/Reset F/0 (useCanvasKeys). Persist camera
 * do engine tự debounce 500ms.
 */
export default function CanvasRoute() {
  const bootstrap = useCanvasBootstrap();
  const resetCamera = useCameraStore((s) => s.reset);

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

  const currentBoard = bootstrap.state.rootBoard;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <CanvasHeader board={currentBoard} onFit={handleFit} onReset={resetCamera} />
      <CanvasApp boardId={boardId} />
    </div>
  );
}
