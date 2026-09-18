import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  RotateCcw,
  Maximize2,
  Sun,
  Moon,
  Undo2,
  Redo2,
  ChevronDown,
  Settings,
  PenTool,
  Square,
} from 'lucide-react';
import { useThemeStore } from '@/stores/theme-store';
import { useUiStyleStore } from '@/stores/ui-style-store';
import { LoadingState, ErrorState } from '@/components/shared';
import { Badge } from '@/components/style';
import { useObjectsStore } from './store/objects-store';
import { useCameraStore } from './store/camera-store';
import { useHistoryStore } from './store/history-store';
import { useCanvasBootstrap } from './hooks/useCanvasBootstrap';
import { useCanvasKeys } from './hooks/useCanvasKeys';
import { computeContentBounds } from './lib/content-bounds';
import { getCameraEngine } from './engine/camera-engine';
import { isRootBoard, type Board } from './types';
import { CanvasApp } from './components/CanvasApp';

/**
 * Canvas route `/canvas`. Bootstrap → LoadingState | ErrorState | CanvasApp.
 *
 * Header 2 row (Milanote parity):
 *   Row 1 — tools: back → home + breadcrumb + spacer + Undo/Redo + theme toggle
 *   Row 2 — board: object count + centered title + View dropdown (zoom%/Fit/Reset)
 *
 * Board title Phase B là static "Canvas". Phase D nested boards sẽ đổi thành
 * currentBoard.title editable.
 *
 * Undo/Redo Ctrl+Z / Ctrl+Shift+Z (hotkey giữ). Button visible.
 * Fit/Reset gắn phím F/0 (giữ), thêm menu item trong View dropdown.
 * Persist camera do engine tự debounce 500ms.
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
      <header className="flex flex-col border-b border-border bg-card">
        <ToolsRow board={currentBoard} />
        <BoardRow board={currentBoard} onFit={handleFit} onReset={resetCamera} />
      </header>

      <CanvasApp boardId={boardId} />
    </div>
  );
}

// ============================================================
// Row 1: Tools
// ============================================================
// Trái: back + breadcrumb. Phải: undo/redo + theme.
// Tách subscribe undo/redo state riêng vào UndoRedoCluster để không re-render
// toàn row khi push history.

function ToolsRow({ board }: { board: Board }) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  return (
    <div className="flex h-10 items-center gap-2 px-4">
      <Link
        to="/"
        aria-label="Về trang chủ"
        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <Breadcrumb board={board} />

      <div className="ml-auto flex items-center gap-1">
        <UndoRedoCluster />
        <div className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Chuyển sang light' : 'Chuyển sang dark'}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Đổi theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <StyleToggle />
        <button
          type="button"
          title="Cài đặt (sắp có)"
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Cài đặt"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Toggle phong cách hiển thị: hand (drawably vẽ tay) / flat (phẳng shadcn).
// Đọc/ghi useUiStyleStore (persist localStorage). Icon PenTool = hand, Square = flat.
function StyleToggle() {
  const style = useUiStyleStore((s) => s.style);
  const toggle = useUiStyleStore((s) => s.toggle);
  const isHand = style === 'hand';
  return (
    <button
      type="button"
      onClick={toggle}
      title={isHand ? 'Chuyển sang phẳng' : 'Chuyển sang vẽ tay'}
      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label="Đổi phong cách"
    >
      {isHand ? <PenTool className="h-4 w-4" /> : <Square className="h-4 w-4" />}
    </button>
  );
}

function Breadcrumb({ board }: { board: Board }) {
  // Phase B: chỉ có root board — breadcrumb = board.name ("Home" mặc định).
  // Phase D nested: build path chain root → ... → current.
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs">
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
      <span className="font-medium text-foreground">{board.name}</span>
    </nav>
  );
}

function UndoRedoCluster() {
  const undoCount = useHistoryStore((s) => s.undoStack.length);
  const redoCount = useHistoryStore((s) => s.redoStack.length);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  return (
    <>
      <button
        type="button"
        onClick={undo}
        disabled={undoCount === 0}
        title="Undo (Ctrl+Z)"
        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        aria-label="Undo"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={redoCount === 0}
        title="Redo (Ctrl+Shift+Z)"
        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        aria-label="Redo"
      >
        <Redo2 className="h-4 w-4" />
      </button>
    </>
  );
}

// ============================================================
// Row 2: Board
// ============================================================
// Trái: object count. Center: title. Phải: View dropdown.

function BoardRow({
  board,
  onFit,
  onReset,
}: {
  board: Board;
  onFit: () => void;
  onReset: () => void;
}) {
  // Root board (Home) → ẩn title center (đã có breadcrumb ở row 1).
  // Nested board → hiện board.name. Phase D editable inline.
  const showTitle = !isRootBoard(board);

  return (
    <div className="grid h-10 grid-cols-3 items-center border-t border-border/50 px-4">
      <div className="flex items-center gap-2">
        <ObjectCountBadge />
      </div>
      <div className="flex items-center justify-center">
        {showTitle ? (
          <h1 className="text-sm font-medium tracking-tight text-foreground">
            {board.name}
          </h1>
        ) : null}
      </div>
      <div className="flex items-center justify-end">
        <ViewMenu onFit={onFit} onReset={onReset} />
      </div>
    </div>
  );
}

function ObjectCountBadge() {
  const objectCount = useObjectsStore((s) => s.objects.size);
  return (
    <Badge tone="default">
      {objectCount} object{objectCount === 1 ? '' : 's'}
    </Badge>
  );
}

// View dropdown — inline mini menu. Zoom% liên tục update qua ZoomBadge (subscribe
// riêng, cô lập re-render 60Hz trong ramp). Menu items: Fit, Reset, Zoom to 100%.
function ViewMenu({ onFit, onReset }: { onFit: () => void; onReset: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Click outside close.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>View</span>
        <ZoomBadge />
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-tooltip mt-1 w-40 rounded-md border border-border bg-popover p-1 shadow-elevation-2"
        >
          <ViewMenuItem
            icon={Maximize2}
            label="Fit content"
            hint="F"
            onClick={() => {
              setOpen(false);
              onFit();
            }}
          />
          <ViewMenuItem
            icon={RotateCcw}
            label="Reset view"
            hint="0"
            onClick={() => {
              setOpen(false);
              onReset();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function ViewMenuItem({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: typeof Maximize2;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted"
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="flex-1 text-left">{label}</span>
      {hint ? (
        <span className="text-[10px] tabular-nums text-muted-foreground/70">{hint}</span>
      ) : null}
    </button>
  );
}

// Isolate zoom subscription — cô lập re-render 60Hz trong ramp. Chỉ span nhỏ này
// re-render, ViewMenu button + BoardRow không bị đụng.
function ZoomBadge() {
  const zoom = useCameraStore((s) => s.camera.zoom);
  return (
    <span className="text-xs tabular-nums text-foreground/80">
      {Math.round(zoom * 100)}%
    </span>
  );
}
