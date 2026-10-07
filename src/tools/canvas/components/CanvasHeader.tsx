import { Undo2, Redo2, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/style';
import { AccountMenu } from '@/components/settings/AccountMenu';
import { useI18n } from '@/lib/i18n';
import { useObjectsStore } from '../store/objects-store';
import { useHistoryStore } from '../store/history-store';
import type { Board } from '../types';
import { BreadcrumbList } from './BreadcrumbList';
import { BoardTitleRow } from './BoardTitleRow';
import { useInterfaceScale } from '@/stores/interface-store';

/**
 * CanvasHeader — 2 hàng:
 *   - Hàng 1: breadcrumb (trái, tự rút theo bề rộng) + số object + Undo/Redo +
 *     avatar (phải).
 *   - Hàng 2 (BoardTitleRow): trạng thái lưu / tên board / Chia sẻ + Xuất + % zoom.
 *
 * Co dãn: breadcrumb `flex-1 min-w-0` co tới 0 và tự ẩn bớt cấp; cụm bên phải
 * không co (`shrink-0`) nên không bao giờ mất nút.
 *
 * Các cụm subscribe store riêng (UndoRedoCluster / ObjectCountBadge / ZoomBadge ở HeaderPopups)
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
  const uiScale = useInterfaceScale();
  return (
    // Kích thước giao diện: zoom (không transform) để header thấp lại thật, canvas lấp phần dư.
    // Menu tài khoản + View nằm trong header nên nhỏ theo.
    <header style={{ zoom: uiScale }} className="flex flex-col border-b border-border bg-card">
      {/* px-2 (8px) cả 2 hàng, để thẳng mép nhau: khoảng nhỏ với mép màn hình như Milanote. */}
      <div className="flex h-11 items-center gap-3 px-2">
        <div className="flex min-w-0 flex-1 items-center">
          <BreadcrumbList board={board} />
        </div>
        {/* shrink-0: breadcrumb co trước, cụm bên phải không bao giờ bị ép mất. */}
        <div className="flex shrink-0 items-center gap-1">
          <ObjectCountBadge />
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolsCluster />
        </div>
      </div>
      <BoardTitleRow board={board} onFit={onFit} onReset={onReset} />
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
// Cụm công cụ bên phải
// ============================================================

// Theme + phong cách đã chuyển vào modal Cài đặt (avatar → Cài đặt → Giao diện).
function ToolsCluster() {
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
// Số object (bên phải, trước Undo/Redo)
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
