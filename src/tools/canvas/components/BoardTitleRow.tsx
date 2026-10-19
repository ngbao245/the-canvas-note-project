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
 * Luôn hiện. ShareButton + SaveStatusDot export cho header kiểu đảo nổi
 * (CanvasHeaderIslands); SaveStatus (chữ) + TitleEditable chỉ dùng ở đây.
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

/** Màu chấm trạng thái lưu (kiểu đảo). xanh = đã lưu / đã lên server (đứng yên),
 *  vàng = đang lưu / chờ đồng bộ (chớp nhẹ), đỏ = lỗi. Luôn có 1 màu, chấm không ẩn. */
type SaveDotTone = 'success' | 'warning' | 'destructive';

/**
 * Gom trạng thái lưu máy + đồng bộ server thành 1 chữ (tooltip) + 1 màu chấm.
 * Dùng cho cả chữ (header 2 hàng) lẫn chấm (header đảo nổi).
 * Ưu tiên: lỗi ghi máy > trạng thái đồng bộ > trạng thái lưu máy.
 */
function useSaveStatus(): { text: string; tone: SaveDotTone } {
  const phase = useSaveStatusStore((s) => s.phase);
  // Đồng bộ server chỉ có khi outbox chạy (dev); bản build luôn idle.
  const syncPhase = useSyncStatusStore((s) => s.phase);
  const { t } = useI18n();
  const key =
    phase === 'error' ? SAVE_TEXT_KEY.error : (SYNC_TEXT_KEY[syncPhase] ?? SAVE_TEXT_KEY[phase]);
  const text = key ? t(key) : '';
  // Chấm luôn hiện (bạn chốt 2026-10-14): mặc định xanh "đã lưu" đứng yên; đang
  // lưu / chờ đồng bộ → vàng chớp nhẹ; ghi máy lỗi → đỏ. idle cả 2 (chưa sửa gì,
  // hoặc đã lưu xong) coi như đã lưu → xanh. text rỗng lúc idle → tooltip lấy
  // nhãn "Đã lưu" mặc định.
  const tone: SaveDotTone =
    phase === 'error'
      ? 'destructive'
      : phase === 'saving' || syncPhase === 'local' || syncPhase === 'unsynced'
        ? 'warning'
        : 'success';
  const label = text || t('CANVAS.HEADER.SAVED');
  return { text: label, tone };
}

/** Chữ trạng thái lưu (header 2 hàng). */
function SaveStatus() {
  const { text, tone } = useSaveStatus();
  const colorCls =
    tone === 'destructive'
      ? 'text-destructive'
      : tone === 'warning'
        ? 'text-warning'
        : 'text-muted-foreground';
  // aria-live: trình đọc màn hình đọc khi trạng thái đổi. Span luôn có mặt
  // (rỗng khi idle) để vùng live không bị mount/unmount.
  return (
    <span aria-live="polite" className={`whitespace-nowrap text-xs ${colorCls}`}>
      {text}
    </span>
  );
}

const DOT_COLOR: Record<SaveDotTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
};

/**
 * Chấm trạng thái lưu (header đảo nổi): 1 chấm 8px, màu theo trạng thái, tooltip
 * là chữ đầy đủ. Luôn hiện (bạn chốt 2026-10-14): xanh đứng yên = đã lưu, vàng
 * chớp nhẹ = đang lưu / chờ đồng bộ, đỏ = lỗi. Không nhảy layout khi đổi màu.
 * aria-live để trình đọc màn hình vẫn nghe được trạng thái.
 */
export function SaveStatusDot() {
  const { text, tone } = useSaveStatus();
  // idle/đã lưu (xanh) thở nhè nhẹ (bạn chốt 2026-10-14); đang lưu / chờ (vàng) thở
  // nhanh + sâu hơn → báo "đang chạy"; lỗi (đỏ) đứng yên cho dễ chú ý.
  const anim =
    tone === 'warning'
      ? 'animate-save-breathe-strong'
      : tone === 'success'
        ? 'animate-save-breathe'
        : '';
  return (
    <span
      role="img"
      aria-live="polite"
      aria-label={text}
      title={text}
      className={`h-2 w-2 shrink-0 rounded-full ${DOT_COLOR[tone]} ${anim}`}
    />
  );
}

// Chữ tên board dùng chung cho lúc xem và lúc sửa → bấm vào sửa không nhảy cỡ.
// 24px (text-2xl) + leading-none: to rõ, nhưng line-height = 1 nên chiều cao
// dòng = đúng cỡ chữ (24px < hàng 48px) → KHÔNG đẩy header cao ra. items-center
// của hàng tự canh giữa. font-serif (Fraunces) = cùng chất chữ heading note.
const TITLE_TEXT_CLS = 'font-serif text-2xl font-semibold leading-none tracking-tight text-foreground';

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

  // Click ra ngoài ô (kể cả xuống canvas) → lưu + thoát. Canvas surface gọi
  // preventDefault ở pointerdown nên input không tự blur → onBlur không fire;
  // bắt pointerdown toàn trang (capture) để tự commit. Esc/Enter vẫn qua
  // editKeyHandler. Chỉ gắn khi đang sửa.
  useEffect(() => {
    if (!editing) return;
    const onDown = (ev: PointerEvent) => {
      if (ev.target instanceof Node && inputRef.current?.contains(ev.target)) return;
      commit();
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
    // commit đọc value/board qua closure mới mỗi render; chỉ cần gắn/gỡ theo editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, value, board.name]);

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
  // Vào sửa: value = board.name nên span = đúng chữ đang xem → ô giữ nguyên bề
  // rộng, gõ thêm mới giãn (bạn chốt 2026-10-14). max-w-full: không vượt đảo giữa.
  return (
    <div className="inline-grid min-w-0 max-w-full">
      <span
        aria-hidden="true"
        className={`invisible col-start-1 row-start-1 max-w-full overflow-hidden whitespace-pre ${TITLE_TEXT_CLS}`}
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
export function ShareButton() {
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
