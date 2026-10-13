import { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LoadingState, ErrorState } from '@/components/shared';
import { useObjectsStore } from './store/objects-store';
import { useCameraStore } from './store/camera-store';
import { useBoardsStore } from './store/boards-store';
import { useCurrentBoardStore } from './store/current-board-store';
import { useCanvasBootstrap } from './hooks/useCanvasBootstrap';
import { useCanvasKeys } from './hooks/useCanvasKeys';
import { useBoardSync } from './hooks/useBoardSync';
import { useCanvasPersistence } from './hooks/useCanvasPersistence';
import { computeContentBounds } from './lib/content-bounds';
import { getCameraEngine } from './engine/camera-engine';
import { CanvasApp } from './components/CanvasApp';
import { CanvasHeader } from './components/CanvasHeader';

/**
 * Canvas route: hỗ trợ 3 pattern URL (từ nested-boards spec):
 *   /canvas                          → root board
 *   /canvas/:boardId                 → nested board
 *   /canvas/:boardId/:slug           → link cũ, redirect về `/canvas/:boardId`
 *                                      (URL chỉ dùng id từ 2026-10-02)
 *
 * Bootstrap 1 lần (load boards từ IDB). useBoardSync theo dõi currentBoardId
 * → load objects + hydrate camera + persist callback theo board đang xem.
 *
 * Redirect logic:
 *   - Paste `/canvas/{rootBoardId}` → canonical `/canvas`.
 *   - Paste `/canvas/{invalid}` → `/canvas` + (nice-to-have: toast).
 */
export default function CanvasRoute() {
  const params = useParams<{ boardId?: string; slug?: string }>();
  const navigate = useNavigate();
  const paramBoardId = params.boardId ?? null;
  const hasSlug = params.slug !== undefined;

  const bootstrap = useCanvasBootstrap();
  const rootBoard = bootstrap.state.phase === 'ready' ? bootstrap.state.rootBoard : null;

  // URL `/canvas` = Home, nhưng board đang xem luôn là id thật (Home cũng vậy).
  // null chỉ khi bootstrap chưa xong. Id Home trong URL → canonical `/canvas`.
  const isCanonicalRoot = rootBoard !== null && paramBoardId === rootBoard.id;
  const currentBoardId = paramBoardId ?? rootBoard?.id ?? null;

  // Sync URL param → store (consumer khác đọc store thay vì gọi useParams lại).
  useEffect(() => {
    useCurrentBoardStore.getState().set(currentBoardId);
  }, [currentBoardId]);

  // Redirect canonical + invalid boardId → `/canvas`.
  useEffect(() => {
    if (!rootBoard) return;
    if (isCanonicalRoot) {
      navigate('/canvas', { replace: true });
      return;
    }
    // Link cũ có slug (`/canvas/:id/:slug`) → URL chỉ id.
    if (paramBoardId !== null && hasSlug) {
      navigate(`/canvas/${paramBoardId}`, { replace: true });
      return;
    }
    if (paramBoardId !== null) {
      const exists = useBoardsStore.getState().boards.has(paramBoardId);
      if (!exists) {
        navigate('/canvas', { replace: true });
      }
    }
  }, [paramBoardId, rootBoard, isCanonicalRoot, hasSlug, navigate]);

  // Sync objects + camera + persist theo currentBoardId đang xem.
  useBoardSync({ currentBoardId, rootBoard });
  // Đẩy ghi khi ẩn / đóng tab, đồng bộ + khoá sửa giữa các tab.
  useCanvasPersistence();

  // Resolve Board record đang xem để pass xuống Header.
  const currentBoard = useBoardsStore((s) =>
    currentBoardId ? (s.boards.get(currentBoardId) ?? null) : null,
  );

  const resetCamera = useCameraStore((s) => s.reset);

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

  if (bootstrap.state.phase === 'loading' || !currentBoard) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingState label="Đang tải canvas..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <CanvasHeader board={currentBoard} onFit={handleFit} onReset={resetCamera} />
      <CanvasApp boardId={currentBoard.id} />
    </div>
  );
}
