import { Link } from 'react-router-dom';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { useBoardsStore } from '../store/boards-store';
import { useBreadcrumbFit } from '../hooks/useBreadcrumbFit';
import { usePopup } from '../hooks/usePopup';
import type { Board } from '../types';

/**
 * BreadcrumbList — đường dẫn các cấp board ở header-left (Milanote parity).
 *   - Home (logo) luôn đầu, board đang xem luôn cuối.
 *   - Mỗi mục: ô màu của board + tên. Tên dài cắt "…", rê chuột thấy đủ.
 *   - Thiếu chỗ → ẩn dần cấp giữa thành nút "..." (bấm mở menu các cấp ẩn).
 *     Số cấp hiện theo bề rộng thật, không cố định (xem useBreadcrumbFit).
 *   - Ẩn hết cấp giữa vẫn thiếu → tên board hiện tại tự cắt "…".
 */

/** Bề rộng tối đa tên 1 cấp (Milanote `breadcrumb-title` max-width 30rem = 300px,
 *  root font 10px). Áp cho cả mục hiện tại → tên 100 ký tự không đẩy ẩn hết cấp
 *  cha (giống DOM Milanote). */
const CRUMB_MAX_CLS = 'max-w-[300px]';

export function BreadcrumbList({ board }: { board: Board }) {
  const boards = useBoardsStore((s) => s.boards);
  const chain = buildChain(board, boards);
  const fitKey = chain.map((b) => `${b.id}:${b.name}:${b.color}`).join('|');
  const { containerRef, measureRef, hidden } = useBreadcrumbFit(fitKey);

  const last = chain.length - 1;
  const hiddenBoards = chain.slice(1, 1 + hidden);

  return (
    <nav
      ref={containerRef}
      aria-label="Breadcrumb"
      className="relative flex min-w-0 flex-1 items-center text-xs"
    >
      {/* Lớp đo: đủ mọi mục ở bề rộng tự nhiên, ẩn và không nhận chuột/focus. */}
      <div aria-hidden="true" className="pointer-events-none invisible absolute inset-0 overflow-hidden">
        <div ref={measureRef} className="absolute left-0 top-0 flex w-max items-center">
          {chain.map((b, i) => (
            <Crumb key={b.id} board={b} index={i} isCurrent={i === last} measure />
          ))}
          <div data-crumb-ellipsis className="flex items-center">
            <Separator />
            <EllipsisButtonShape />
          </div>
        </div>
      </div>

      {chain.map((b, i) => {
        if (i > 0 && i <= hidden) {
          // Cấp ẩn: chỉ render nút "..." 1 lần, tại vị trí cấp ẩn đầu tiên.
          return i === 1 ? <EllipsisMenu key="ellipsis" boards={hiddenBoards} /> : null;
        }
        return <Crumb key={b.id} board={b} index={i} isCurrent={i === last} />;
      })}
    </nav>
  );
}

function Crumb({
  board,
  index,
  isCurrent,
  measure = false,
}: {
  board: Board;
  index: number;
  isCurrent: boolean;
  measure?: boolean;
}) {
  const content = (
    <>
      <BoardIcon board={board} />
      <span className="truncate">{board.name}</span>
    </>
  );
  // Mọi mục cùng max-width + cùng font → lớp đo khớp bản thật. Mục hiện tại
  // thêm min-w-0 (co được) → khi ẩn hết cấp giữa vẫn thiếu chỗ, nó cắt "…" cuối.
  const itemCls = `flex min-w-0 items-center gap-1.5 ${CRUMB_MAX_CLS}`;

  return (
    <div
      data-crumb-measure={measure ? '' : undefined}
      className={`flex items-center ${isCurrent && !measure ? 'min-w-0' : 'shrink-0'}`}
    >
      {index > 0 ? <Separator /> : null}
      {measure ? (
        <span className={itemCls}>{content}</span>
      ) : isCurrent ? (
        // Milanote parity: board đang xem là chữ mờ, không phải link (đang ở đó
        // rồi, bấm không có tác dụng). aria-current cho trình đọc màn hình.
        <span
          aria-current="page"
          title={board.name}
          className={`${itemCls} cursor-default text-muted-foreground`}
        >
          {content}
        </span>
      ) : (
        // Cấp cha bấm được → chữ đậm màu chính, hover có nền nhẹ cho biết là nút.
        <Link
          to={linkTo(board)}
          title={board.name}
          className={`${itemCls} -mx-1 rounded-sm px-1 py-0.5 text-foreground transition-colors duration-200 hover:bg-muted`}
        >
          {content}
        </Link>
      )}
    </div>
  );
}

function Separator() {
  return <ChevronRight className="mx-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />;
}

/** Icon đầu mục: Home = logo tạm tròn đen, board = ô màu của board đó. */
function BoardIcon({ board }: { board: Board }) {
  if (board.parentId === null) {
    // Màu logo là nhận diện, không theo theme. Viền mờ để thấy trên nền tối.
    return (
      <span
        aria-hidden="true"
        className="h-[18px] w-[18px] shrink-0 rounded-full ring-1 ring-border"
        style={{ backgroundColor: '#000' }}
      />
    );
  }
  // Board.color là data user (palette), không phải theme → inline style.
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 rounded-[4px] ring-1 ring-border/60"
      style={{ backgroundColor: board.color }}
    />
  );
}

const ELLIPSIS_BTN_CLS =
  'grid h-6 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground';

/** Hình nút "..." cho lớp đo (cùng kích thước nút thật, không có hành vi). */
function EllipsisButtonShape() {
  return (
    <span className={ELLIPSIS_BTN_CLS}>
      <MoreHorizontal className="h-4 w-4" />
    </span>
  );
}

/** Nút "..." + menu các cấp bị ẩn. Đóng khi bấm ngoài, Esc, hoặc chọn 1 cấp. */
function EllipsisMenu({ boards }: { boards: Board[] }) {
  // Bấm ngoài / Esc đóng (Esc không lọt xuống canvas) — xem usePopup.
  const { open, ref, close, toggle } = usePopup();

  return (
    <div ref={ref} className="relative flex shrink-0 items-center">
      <Separator />
      <button
        type="button"
        onClick={toggle}
        className={ELLIPSIS_BTN_CLS}
        aria-label={`Hiện ${boards.length} cấp bị ẩn`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-tooltip mt-1 flex w-56 flex-col rounded-md border border-border bg-popover p-1 shadow-elevation-2"
        >
          {boards.map((b) => (
            <Link
              key={b.id}
              to={linkTo(b)}
              role="menuitem"
              title={b.name}
              onClick={close}
              className="flex min-w-0 items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted"
            >
              <BoardIcon board={b} />
              <span className="truncate">{b.name}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Chuỗi board từ Home → board đang xem. `seen` chặn vòng lặp nếu data lỗi. */
function buildChain(board: Board, boards: Map<string, Board>): Board[] {
  const chain: Board[] = [];
  let cursor: Board | undefined = board;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor.id)) {
    chain.unshift(cursor);
    seen.add(cursor.id);
    cursor = cursor.parentId ? boards.get(cursor.parentId) : undefined;
  }
  return chain;
}

/** URL chỉ id. Home là `/canvas`. */
function linkTo(b: Board): string {
  return b.parentId === null ? '/canvas' : `/canvas/${b.id}`;
}
