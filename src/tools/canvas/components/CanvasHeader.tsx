import { useEffect, useRef, useState } from 'react';
import {
  RotateCcw,
  Maximize2,
  Undo2,
  Redo2,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/style';
import { AccountMenu } from '@/components/settings/AccountMenu';
import { useI18n } from '@/lib/i18n';
import { useObjectsStore } from '../store/objects-store';
import { useCameraStore } from '../store/camera-store';
import { useHistoryStore } from '../store/history-store';
import type { Board } from '../types';
import { BreadcrumbList } from './BreadcrumbList';

/**
 * CanvasHeader — 2 hàng:
 *   - Hàng 1: breadcrumb các cấp (trái, tự rút theo bề rộng) + công cụ (phải:
 *     Undo/Redo + avatar mở popup tài khoản → Cài đặt).
 *   - Hàng 2: số object (trái) + View (phải).
 *
 * Không có title board ở giữa: breadcrumb đã cho biết đang ở board nào.
 * Đổi tên board: double-click tên trên tile ở board cha.
 *
 * Co dãn hàng 1: breadcrumb `flex-1 min-w-0` co tới 0 và tự ẩn bớt cấp; cụm
 * công cụ không co (`shrink-0`) nên không bao giờ mất nút.
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
      <div className="flex h-10 items-center gap-3 px-4">
        <div className="flex min-w-0 flex-1 items-center">
          <BreadcrumbList board={board} />
        </div>
        <ToolsCluster />
      </div>
      <div className="flex h-10 items-center justify-between gap-3 border-t border-border/50 px-4">
        <ObjectCountBadge />
        <ViewMenu onFit={onFit} onReset={onReset} />
      </div>
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
  icon: LucideIcon;
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
// Hàng 1 — cụm công cụ bên phải
// ============================================================

// Theme + phong cách đã chuyển vào modal Cài đặt (avatar → Cài đặt → Giao diện).
function ToolsCluster() {
  // shrink-0: breadcrumb co trước, cụm nút không bao giờ bị ép mất.
  return (
    <div className="flex shrink-0 items-center gap-1">
      <UndoRedoCluster />
      <div className="mx-1 h-4 w-px bg-border" />
      <AccountMenu />
    </div>
  );
}

function UndoRedoCluster() {
  const undoCount = useHistoryStore((s) => s.undoStack.length);
  const redoCount = useHistoryStore((s) => s.redoStack.length);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const { t } = useI18n();

  // title (tooltip) và aria-label (trình đọc màn hình) cũng là chữ UI → qua bộ dịch.
  return (
    <>
      <IconButton
        icon={Undo2}
        onClick={undo}
        disabled={undoCount === 0}
        title={t('CANVAS.HEADER.UNDO_TITLE')}
        ariaLabel={t('CANVAS.HEADER.UNDO')}
      />
      <IconButton
        icon={Redo2}
        onClick={redo}
        disabled={redoCount === 0}
        title={t('CANVAS.HEADER.REDO_TITLE')}
        ariaLabel={t('CANVAS.HEADER.REDO')}
      />
    </>
  );
}

// ============================================================
// Hàng 2 — số object + View
// ============================================================

function ObjectCountBadge() {
  const objectCount = useObjectsStore((s) => s.objects.size);
  const { t } = useI18n();
  // nowrap: chữ không xuống dòng làm header cao lên.
  // Số nhiều: truyền `count`, bộ dịch tự chọn "1 object" / "3 objects" (vi không đổi).
  return (
    <span className="shrink-0 whitespace-nowrap">
      <Badge tone="default">{t('CANVAS.COUNT.OBJECT', { count: objectCount })}</Badge>
    </span>
  );
}

// View dropdown — inline mini menu. Zoom% liên tục update qua ZoomBadge (subscribe
// riêng, cô lập re-render 60Hz trong ramp). Menu items: Fit, Reset.
function ViewMenu({ onFit, onReset }: { onFit: () => void; onReset: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

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
        {/* <span>View</span> */}
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
            label={t('CANVAS.HEADER.FIT_CONTENT')}
            hint="F"
            onClick={() => {
              setOpen(false);
              onFit();
            }}
          />
          <ViewMenuItem
            icon={RotateCcw}
            label={t('CANVAS.HEADER.RESET_VIEW')}
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
  return <span className="text-xs tabular-nums text-foreground/80">{Math.round(zoom * 100)}%</span>;
}
