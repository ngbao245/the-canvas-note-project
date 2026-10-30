import { Bell, Redo2, Search, Undo2, type LucideIcon } from 'lucide-react';
import { HelpMenu } from './HelpMenu';
import { shortcutKeys, useKeyboardPlatform } from '@/lib/shortcuts';
import { CANVAS_SHORTCUT_DEFS } from '../shortcuts';
import { Badge } from '@/components/style';
import { AccountMenu } from '@/components/settings/AccountMenu';
import { useI18n } from '@/lib/i18n';
import { useObjectsStore } from '../store/objects-store';
import { useHistoryStore } from '../store/history-store';
import type { Board } from '../types';
import { BreadcrumbList } from './BreadcrumbList';
import { BoardTitleRow } from './BoardTitleRow';
import { useInterfaceScale } from '@/stores/interface-store';
import { Tooltip } from '@/components/shared';
import { FOCUS_RING } from '@/lib/focus-ring';
import { PRESSABLE_MOTION } from '@/lib/motion';

/**
 * CanvasHeader — 2 hàng:
 *   - Hàng 1: breadcrumb (trái, tự rút theo bề rộng) + số object + Undo/Redo +
 *     Trợ giúp + Tìm kiếm + Thông báo + avatar (phải).
 *   - Hàng 2 (BoardTitleRow): trạng thái lưu / tên board / Chia sẻ + Xuất + % zoom.
 *
 * Co dãn: breadcrumb `flex-1 min-w-0` co tới 0 và tự ẩn bớt cấp; cụm bên phải
 * không co (`shrink-0`) nên không bao giờ mất nút.
 *
 * Kiểu đảo nổi (Cài đặt → Canvas → Kiểu header) ở CanvasHeaderIslands, dùng lại
 * các cụm export ở đây + mảnh của BoardTitleRow.
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
    // select-none: gốc vùng header (chrome). Ô sửa tên board là <input> nên vẫn chọn được.
    <header
      style={{ zoom: uiScale }}
      className="flex select-none flex-col border-b border-border bg-card"
    >
      {/* px-2 (8px) cả 2 hàng, để thẳng mép nhau: khoảng nhỏ với mép màn hình như Milanote. */}
      <div className="flex h-11 items-center gap-3 px-2">
        <div className="flex min-w-0 flex-1 items-center">
          <BreadcrumbList board={board} />
        </div>
        {/* shrink-0: breadcrumb co trước, cụm bên phải không bao giờ bị ép mất. */}
        <div className="flex shrink-0 items-center gap-1">
          <ObjectCountBadge />
          <HeaderDivider />
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

const ICON_BTN_CLS = `grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground ${PRESSABLE_MOTION} ${FOCUS_RING}`;
// aria-disabled (không `disabled`) để nút tắt vẫn hiện tooltip.
const ICON_BTN_DISABLED_CLS =
  'aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted-foreground';

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
    <Tooltip label={title ?? ariaLabel} side="bottom">
      <button
        type="button"
        onClick={disabled ? undefined : onClick}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
        className={`${ICON_BTN_CLS} ${ICON_BTN_DISABLED_CLS}`}
      >
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </button>
    </Tooltip>
  );
}

// ============================================================
// Cụm công cụ bên phải
// ============================================================

// Theme + phong cách đã chuyển vào modal Cài đặt (avatar → Cài đặt → Giao diện).
// Trợ giúp mở popup (HelpMenu). Tìm kiếm / Thông báo: chỉ là nút, chưa có tính năng.
function ToolsCluster() {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <UndoRedoCluster />
      <HeaderDivider />
      <HelpSearchNotify />
      <AccountMenu />
    </div>
  );
}

/** Vạch ngăn dọc giữa các cụm nút. Dùng chung với header đảo nổi. */
export function HeaderDivider() {
  return <div className="mx-1 h-4 w-px bg-border" />;
}

/** Trợ giúp + Tìm kiếm + Thông báo. Dùng chung với header đảo nổi. */
export function HelpSearchNotify() {
  const { t } = useI18n();
  return (
    <>
      <HelpMenu />
      <SoonIconButton icon={Search} label={t('CANVAS.HEADER.SEARCH')} />
      <SoonIconButton icon={Bell} label={t('CANVAS.HEADER.NOTIFICATIONS')} />
    </>
  );
}

/**
 * Nút icon chưa có tính năng. aria-disabled thay vì `disabled` để vẫn nhận hover
 * → hiện tooltip "Sắp có" (cùng cách nút Chia sẻ).
 */
function SoonIconButton({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const { t } = useI18n();
  return (
    <Tooltip label={`${label} (${t('COMMON.COMING_SOON')})`} side="bottom">
      <button
        type="button"
        aria-disabled="true"
        aria-label={label}
        className={`grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted ${PRESSABLE_MOTION} ${FOCUS_RING}`}
      >
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </button>
    </Tooltip>
  );
}

export function UndoRedoCluster() {
  const undoCount = useHistoryStore((s) => s.undoStack.length);
  const redoCount = useHistoryStore((s) => s.redoStack.length);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const { t } = useI18n();
  const platform = useKeyboardPlatform();

  // title (tooltip) và aria-label (trình đọc màn hình) cũng là chữ UI → qua bộ dịch.
  // Tổ hợp phím lấy từ bảng phím, không ghi cứng trong file dịch.
  const undoLabel = t('CANVAS.HEADER.UNDO');
  const redoLabel = t('CANVAS.HEADER.REDO');
  return (
    <>
      <IconButton
        icon={Undo2}
        onClick={undo}
        disabled={undoCount === 0}
        title={t('COMMON.WITH_SHORTCUT', {
          label: undoLabel,
          keys: shortcutKeys(CANVAS_SHORTCUT_DEFS['canvas.undo'], platform),
        })}
        ariaLabel={undoLabel}
      />
      <IconButton
        icon={Redo2}
        onClick={redo}
        disabled={redoCount === 0}
        title={t('COMMON.WITH_SHORTCUT', {
          label: redoLabel,
          keys: shortcutKeys(CANVAS_SHORTCUT_DEFS['canvas.redo'], platform),
        })}
        ariaLabel={redoLabel}
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
