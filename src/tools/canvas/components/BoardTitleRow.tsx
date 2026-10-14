import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages';
import { editKeyHandler } from '@/lib/dom';
import { renameBoard } from '../engine/actions';
import { ExportMenu, ViewMenu } from './HeaderPopups';
import { useSaveStatusStore, type SavePhase } from '../store/save-status-store';
import { useSyncStatusStore, type SyncStatusPhase } from '../store/sync-status-store';
import { isRootBoard, type Board } from '../types';

/**
 * BoardTitleRow — hàng 2 của header canvas (Milanote `CurrentBoardHeader`):
 *   - Trái: trạng thái lưu (Đang lưu… / Đã lưu / Lưu lỗi), ẩn khi không có gì. Khi outbox
 *     chạy: trạng thái đồng bộ (Đã lưu trên máy / Đã đồng bộ / Chưa đồng bộ).
 *   - Giữa: tên board. Double-click để đổi tên (Home không đổi tên được).
 *   - Phải: nút Chia sẻ (chưa có tính năng) + Xuất (mở popup, chưa xuất được) +
 *     % zoom (mở popup View).
 *
 * Trái và phải cùng `flex-1 basis-0` → chia đều chỗ → tên nằm đúng giữa header.
 * Luôn hiện. Tuỳ chọn ẩn/hiện trong Cài đặt chưa chốt (xem specs/settings/tasks.md Phase 6).
 */
export function BoardTitleRow({
  board,
  onFit,
  onReset,
}: {
  board: Board;
  onFit: () => void;
  onReset: () => void;
}) {
  return (
    // px-2 (8px): khoảng nhỏ với mép màn hình như Milanote, khớp hàng 1 của header.
    <div className="flex h-12 items-center gap-3 border-t border-border/50 px-2">
      <div className="flex min-w-0 flex-1 basis-0 items-center">
        <SaveStatus />
      </div>
      <div className="flex min-w-0 max-w-[50%] justify-center">
        <TitleEditable board={board} />
      </div>
      <div className="flex flex-1 basis-0 items-center justify-end gap-2">
        <ShareButton />
        <ExportMenu />
        {/* Milanote parity: % zoom nằm sau Xuất. */}
        <ViewMenu onFit={onFit} onReset={onReset} />
      </div>
    </div>
  );
}

const SAVE_TEXT_KEY = {
  idle: null,
  saving: 'CANVAS.HEADER.SAVING',
  saved: 'CANVAS.HEADER.SAVED',
  error: 'CANVAS.HEADER.SAVE_ERROR',
} as const satisfies Record<SavePhase, MessageKey | null>;

const SYNC_TEXT_KEY = {
  idle: null,
  local: 'CANVAS.HEADER.SYNC_LOCAL',
  synced: 'CANVAS.HEADER.SYNC_DONE',
  unsynced: 'CANVAS.HEADER.SYNC_PENDING',
} as const satisfies Record<SyncStatusPhase, MessageKey | null>;

function SaveStatus() {
  const phase = useSaveStatusStore((s) => s.phase);
  // Đồng bộ server chỉ có khi outbox chạy (dev); bản build luôn idle → như cũ.
  const syncPhase = useSyncStatusStore((s) => s.phase);
  const { t } = useI18n();
  // Ưu tiên: ghi máy lỗi > trạng thái đồng bộ > trạng thái lưu máy.
  const key =
    phase === 'error' ? SAVE_TEXT_KEY.error : (SYNC_TEXT_KEY[syncPhase] ?? SAVE_TEXT_KEY[phase]);
  const text = key ? t(key) : '';
  const tone =
    phase === 'error'
      ? 'text-destructive'
      : syncPhase === 'unsynced'
        ? 'text-warning'
        : 'text-muted-foreground';
  // aria-live: trình đọc màn hình đọc khi trạng thái đổi. Span luôn có mặt
  // (rỗng khi idle) để vùng live không bị mount/unmount.
  return (
    <span aria-live="polite" className={`whitespace-nowrap text-xs ${tone}`}>
      {text}
    </span>
  );
}

// Chữ tên board dùng chung cho lúc xem và lúc sửa → bấm vào sửa không nhảy cỡ.
// 18px: rõ hơn breadcrumb nhưng không "to đùng" như bản 20px trước.
const TITLE_TEXT_CLS = 'text-lg font-semibold tracking-tight text-foreground';

function TitleEditable({ board }: { board: Board }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(board.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const canRename = !isRootBoard(board);

  useEffect(() => {
    if (!editing) return;
    setValue(board.name);
    // Đợi input mount xong mới focus + bôi đen tên.
    const id = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => clearTimeout(id);
  }, [editing, board.name]);

  const commit = () => {
    const next = value.trim() || 'New Board';
    if (next !== board.name) renameBoard(board.id, next);
    setEditing(false);
  };

  if (!editing) {
    return (
      <h1
        onDoubleClick={canRename ? () => setEditing(true) : undefined}
        title={canRename ? `${board.name} (${t('CANVAS.HEADER.RENAME_HINT')})` : board.name}
        className={`min-w-0 max-w-full truncate ${
          canRename ? 'cursor-text hover:text-primary' : ''
        } ${TITLE_TEXT_CLS}`}
      >
        {board.name}
      </h1>
    );
  }

  // Ô sửa tự giãn theo chữ: span ẩn cùng font chung ô grid với input → grid rộng
  // theo span, input lấp đầy. Không viền (bạn yêu cầu trước đó).
  return (
    <div className="inline-grid min-w-0 max-w-full">
      <span
        aria-hidden="true"
        className={`invisible col-start-1 row-start-1 min-w-[4ch] overflow-hidden whitespace-pre ${TITLE_TEXT_CLS}`}
      >
        {value || ' '}
      </span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={editKeyHandler({ onCommit: commit, onCancel: () => setEditing(false) })}
        aria-label={t('CANVAS.HEADER.BOARD_NAME')}
        className={`col-start-1 row-start-1 w-full min-w-0 bg-transparent p-0 text-center outline-none ${TITLE_TEXT_CLS}`}
      />
    </div>
  );
}

/**
 * Chia sẻ: chỉ là nút, chưa có tính năng. Dùng aria-disabled thay vì `disabled`
 * vì nút `disabled` không nhận hover → không hiện tooltip "Sắp có".
 */
function ShareButton() {
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-disabled="true"
      title={`${t('CANVAS.HEADER.SHARE')} (${t('COMMON.COMING_SOON')})`}
      className="flex h-7 items-center rounded-md bg-primary/60 px-3 text-xs font-medium text-primary-foreground"
    >
      {t('CANVAS.HEADER.SHARE')}
    </button>
  );
}
