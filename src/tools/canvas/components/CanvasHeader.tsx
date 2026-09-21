import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { Badge } from '@/components/style';
import { useObjectsStore } from '../store/objects-store';
import { useCameraStore } from '../store/camera-store';
import { useHistoryStore } from '../store/history-store';
import { useBoardsStore } from '../store/boards-store';
import { renameBoard } from '../engine/actions';
import { boardSlug } from '../lib/slug';
import { isRootBoard, type Board } from '../types';

/**
 * CanvasHeader — header 2 row của canvas (Milanote parity), tách khỏi route.tsx.
 *   Row 1 (tools): back → home + breadcrumb + Undo/Redo + theme/style/settings
 *   Row 2 (board): object count + centered title + View dropdown (zoom%/Fit/Reset)
 *
 * Các cụm subscribe store riêng (UndoRedoCluster / ObjectCountBadge / ZoomBadge)
 * để cô lập re-render — push history hay zoom 60Hz không đụng cả header.
 */
export function CanvasHeader({
  board,
  onFit,
  onReset,
}: {
  board: Board;
  onFit: () => void;
  onReset: () => void;
}) {
  return (
    <header className="flex flex-col border-b border-border bg-card">
      <ToolsRow board={board} />
      <BoardRow board={board} onFit={onFit} onReset={onReset} />
    </header>
  );
}

// ============================================================
// IconButton — nút icon 28px dùng chung (theme/style/settings/undo/redo).
// Gom class Tailwind lặp nhiều lần. disabled tự thêm style mờ + no-hover.
// ============================================================

const ICON_BTN_CLS =
  'grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground';
const ICON_BTN_DISABLED_CLS =
  'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

function IconButton({
  icon: Icon,
  onClick,
  title,
  ariaLabel,
  disabled,
}: {
  icon: typeof ArrowLeft;
  onClick?: () => void;
  title?: string;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={disabled ? `${ICON_BTN_CLS} ${ICON_BTN_DISABLED_CLS}` : ICON_BTN_CLS}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

// ============================================================
// Row 1: Tools
// ============================================================

function ToolsRow({ board }: { board: Board }) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  return (
    <div className="flex h-10 items-center gap-2 px-4">
      <Link
        to="/"
        aria-label="Về trang chủ"
        className={ICON_BTN_CLS}
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <Breadcrumb board={board} />

      <div className="ml-auto flex items-center gap-1">
        <UndoRedoCluster />
        <div className="mx-1 h-4 w-px bg-border" />
        <IconButton
          icon={theme === 'dark' ? Sun : Moon}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Chuyển sang light' : 'Chuyển sang dark'}
          ariaLabel="Đổi theme"
        />
        <StyleToggle />
        <IconButton icon={Settings} title="Cài đặt (sắp có)" ariaLabel="Cài đặt" />
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
    <IconButton
      icon={isHand ? PenTool : Square}
      onClick={toggle}
      title={isHand ? 'Chuyển sang phẳng' : 'Chuyển sang vẽ tay'}
      ariaLabel="Đổi phong cách"
    />
  );
}

function Breadcrumb({ board }: { board: Board }) {
  const boards = useBoardsStore((s) => s.boards);

  // Ancestry chain: walk parentId ngược lên root. Root = board có parentId=null.
  const chain: Board[] = [];
  let cursor: Board | undefined = board;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor.id)) {
    chain.unshift(cursor);
    seen.add(cursor.id);
    cursor = cursor.parentId ? boards.get(cursor.parentId) : undefined;
  }

  // Root board = "Home". Nested giữ name.
  const label = (b: Board) => (b.parentId === null ? 'Home' : b.name);
  const linkTo = (b: Board) =>
    b.parentId === null ? '/canvas' : `/canvas/${b.id}/${boardSlug(b.name)}`;

  // Collapse ≥ 4 segments: `Home / ... / Parent / Current`.
  const collapsed = chain.length >= 4;
  const visible = collapsed
    ? [chain[0], null, chain[chain.length - 2], chain[chain.length - 1]]
    : chain;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs">
      {visible.map((b, i) => {
        // b === null → segment collapse "..." (không clickable ở MVP).
        if (b === null) {
          return (
            <div key={`ellipsis-${i}`} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span
                className="text-muted-foreground/70"
                title="Còn segment ở giữa (chưa mở popover)"
              >
                ...
              </span>
            </div>
          );
        }
        const isLast = i === visible.length - 1;
        return (
          <div key={b.id} className="flex items-center gap-1">
            {i > 0 ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            ) : null}
            {isLast ? (
              <span className="font-medium text-foreground">{label(b)}</span>
            ) : (
              <Link
                to={linkTo(b)}
                className="text-muted-foreground hover:text-foreground"
              >
                {label(b)}
              </Link>
            )}
          </div>
        );
      })}
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
      <IconButton
        icon={Undo2}
        onClick={undo}
        disabled={undoCount === 0}
        title="Undo (Ctrl+Z)"
        ariaLabel="Undo"
      />
      <IconButton
        icon={Redo2}
        onClick={redo}
        disabled={redoCount === 0}
        title="Redo (Ctrl+Shift+Z)"
        ariaLabel="Redo"
      />
    </>
  );
}

// ============================================================
// Row 2: Board
// ============================================================

function BoardRow({
  board,
  onFit,
  onReset,
}: {
  board: Board;
  onFit: () => void;
  onReset: () => void;
}) {
  // Root board → ẩn title center (đã có breadcrumb ở row 1).
  // Nested → hiện board.name, editable inline (double-click → mở editor).
  const showTitle = !isRootBoard(board);

  return (
    <div className="grid h-10 grid-cols-3 items-center border-t border-border/50 px-4">
      <div className="flex items-center gap-2">
        <ObjectCountBadge />
      </div>
      <div className="flex items-center justify-center">
        {showTitle ? <TitleEditable board={board} /> : null}
      </div>
      <div className="flex items-center justify-end">
        <ViewMenu onFit={onFit} onReset={onReset} />
      </div>
    </div>
  );
}

/** Title Row 2 khi nested. Double-click → editable inline, Enter/blur commit,
 *  URL slug replace theo tên mới. Escape huỷ. */
function TitleEditable({ board }: { board: Board }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(board.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setValue(board.name);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [editing, board.name]);

  const commit = () => {
    const next = value.trim() || 'New Board';
    if (next !== board.name) {
      renameBoard(board.id, next);
      // URL slug replace không push history mới (rename không phải navigation).
      navigate(`/canvas/${board.id}/${boardSlug(next)}`, { replace: true });
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <h1
        onDoubleClick={() => setEditing(true)}
        className="cursor-text text-sm font-medium tracking-tight text-foreground hover:text-primary"
        title="Double-click để đổi tên"
      >
        {board.name}
      </h1>
    );
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setEditing(false);
        }
      }}
      className="w-48 bg-transparent text-center text-sm font-medium tracking-tight text-foreground outline-none focus:ring-1 focus:ring-primary rounded-sm px-1"
    />
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
// riêng, cô lập re-render 60Hz trong ramp). Menu items: Fit, Reset.
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
