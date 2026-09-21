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
import { computeContentBounds } from './lib/content-bounds';
import { getCameraEngine } from './engine/camera-engine';
import { CanvasApp } from './components/CanvasApp';
import { CanvasHeader } from './components/CanvasHeader';

/**
 * Canvas route: hỗ trợ 3 pattern URL (từ nested-boards spec):
 *   /canvas                          → root board
 *   /canvas/:boardId                 → nested board
 *   /canvas/:boardId/:slug           → nested board với slug (URL đọc được)
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

  const bootstrap = useCanvasBootstrap();
  const rootBoard = bootstrap.state.phase === 'ready' ? bootstrap.state.rootBoard : null;

  // currentBoardId semantics: null = root. Root board id trong URL → canonical.
  const isCanonicalRoot = rootBoard !== null && paramBoardId === rootBoard.id;
  const currentBoardId = paramBoardId;

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
    if (currentBoardId !== null) {
      const exists = useBoardsStore.getState().boards.has(currentBoardId);
      if (!exists) {
        navigate('/canvas', { replace: true });
      }
    }
  }, [currentBoardId, rootBoard, isCanonicalRoot, navigate]);

  // Sync objects + camera + persist theo currentBoardId đang xem.
  useBoardSync({ currentBoardId, rootBoard });

  // Resolve Board record đang xem để pass xuống Header.
  const currentBoard = useBoardsStore((s) => {
    if (!rootBoard) return null;
    return currentBoardId ? (s.boards.get(currentBoardId) ?? null) : rootBoard;
  });

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
    <div className="flex h-screen flex-col bg-background text-foreground">
      <CanvasHeader board={currentBoard} onFit={handleFit} onReset={resetCamera} />
      <CanvasApp boardId={currentBoardId} />
    </div>
  );
}
