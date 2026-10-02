import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  registerObjectType,
  type ObjectRendererProps,
} from '../../hooks/useObjectRegistry';
import { boardDataSchema, type BoardData } from '../../types';
import { useBoardsStore } from '../../store/boards-store';
import { useObjectsStore } from '../../store/objects-store';
import { useInteractionStore } from '../../store/interaction-store';
import { renameBoard } from '../../engine/actions';
import { boardSlug } from '../../lib/slug';
import { ObjectShell } from './ObjectShell';

/**
 * BoardObject — tile đại diện board con trên canvas cha (Milanote parity):
 *   - Icon vuông ~72x72 solid tô Board.color, rounded-lg.
 *   - Title editable inline (double-click title bubble tới ObjectsLayer set editingId).
 *   - Secondary "N cards" (shallow count objects direct children).
 *   - QuickLineDot top-right handled bởi SelectionBox (parity Note).
 *   - Double-click icon → navigate `/canvas/:linkedBoardId/:slug`.
 *   - Hover khi drop cross-board: ring primary + count preview +1.
 */
function BoardRenderer({ object, isSelected, isEditing, onEditEnd }: ObjectRendererProps) {
  const navigate = useNavigate();
  const parsed = boardDataSchema.safeParse(object.data);
  const linkedBoardId = parsed.success ? parsed.data.linkedBoardId : '';

  const board = useBoardsStore((s) => s.boards.get(linkedBoardId));
  // Shallow count: chỉ đếm object có boardId trực tiếp match, không đệ quy.
  // Rẻ và đủ informative (Milanote cũng shallow).
  const cardCount = useObjectsStore((s) => {
    let n = 0;
    for (const o of s.objects.values()) {
      if (o.boardId === linkedBoardId) n++;
    }
    return n;
  });
  const hoveredForDrop = useInteractionStore((s) => s.hoveredBoardTileId === object.id);

  const name = board?.name || 'New Board';
  const color = board?.color ?? '#71717a';
  const previewCount = hoveredForDrop ? cardCount + 1 : cardCount;

  const onIconDoubleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    // Stop propagation → không bubble lên ObjectsLayer (khỏi kích editing mode).
    e.stopPropagation();
    if (!board) return;
    navigate(`/canvas/${board.id}/${boardSlug(board.name)}`);
  };

  return (
    <ObjectShell selected={isSelected} editing={isEditing} variant="bare">
      <div
        data-board-tile-id={object.id}
        data-linked-board-id={linkedBoardId}
        className="relative flex h-full w-full flex-col items-center justify-start gap-2 pt-2 select-none"
      >
        {/* Icon — click vào đây double = navigate. Ring highlight khi hover drop. */}
        <div
          onDoubleClick={onIconDoubleClick}
          className={`h-[72px] w-[72px] rounded-lg shadow-elevation-1 transition-shadow ${
            hoveredForDrop ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
          }`}
          style={{ backgroundColor: color }}
          aria-label={`Vào board ${name}`}
        />
        {/* Title + count. Title double-click bubble lên ObjectsLayer → editingId set. */}
        {isEditing ? (
          <BoardTitleEditor initial={name} boardId={board?.id} onEditEnd={onEditEnd} />
        ) : (
          <div className="w-full px-1 text-center">
            <div className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
              {name}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              {previewCount} card{previewCount === 1 ? '' : 's'}
            </div>
          </div>
        )}
      </div>
    </ObjectShell>
  );
}

function BoardTitleEditor({
  initial,
  boardId,
  onEditEnd,
}: {
  initial: string;
  boardId: string | undefined;
  onEditEnd: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  const ready = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
    const t = setTimeout(() => {
      ready.current = true;
    }, 250);
    return () => clearTimeout(t);
  }, []);

  const commit = () => {
    if (boardId) renameBoard(boardId, value);
    onEditEnd();
  };

  return (
    <div className="w-full px-1 text-center">
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onEditEnd();
          }
        }}
        onBlur={() => {
          if (!ready.current) {
            ref.current?.focus();
            return;
          }
          commit();
        }}
        className="w-full bg-transparent text-center text-xs font-medium leading-tight text-foreground outline-none"
        placeholder="Tên board"
      />
    </div>
  );
}

registerObjectType({
  type: 'board',
  renderer: BoardRenderer,
  // Milanote parity 98x139 (đo từ DOM Milanote thật): 72px icon + gap + title 2
  // dòng + secondary count.
  defaultGeometry: { width: 98, height: 139, rotation: 0, zIndex: 0 },
  // Placeholder linkedBoardId — createBoardAt override với id Board thực.
  defaultData: (): BoardData => ({ linkedBoardId: '' }),
  label: 'Board',
  showInToolbar: true,
});
