import {
  useEffect,
  useMemo,
  useRef,
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  ArrowLeft,
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  MessageSquare,
  MoreHorizontal,
  Palette,
  Smile,
  Tag,
  Trash2,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { getObjectTypeDefinition, getToolbarObjectTypes } from '../hooks/useObjectRegistry';
import { getCameraEngine } from '../engine/camera-engine';
import { screenToCanvas, clientToCanvas } from '../engine/coord';
import { hitZone } from '../lib/hit-test';
import { createBoardAt, createObjectAt, deleteObjects } from '../engine/actions';
import { useSelectionStore } from '../store/selection-store';
import { useObjectsStore } from '../store/objects-store';
import { useInteractionStore } from '../store/interaction-store';
import { useToolbarDrag } from '../hooks/useToolbarDrag';
import { TileIcon, type TileType } from './TileIcons';
import { scaledFillStyle } from '../lib/scaled-box';
import { useInterfaceScale } from '@/stores/interface-store';

/**
 * Toolbar palette dọc — screen-space overlay trong canvas.
 *
 * 3 mode (Milanote parity, priority editing > element > creation):
 *   - creation (no selection hoặc multi ≠ 1): 8 tile Note/Board/Link/Image/...
 *   - element (single object selected): Dismiss + contextual per-type actions.
 *   - editing (user double-click Note): Dismiss + text formatting per-type.
 *
 * Element + editing actions per-type — mỗi ObjectTypeDefinition đăng ký
 * `renderElementActions` / `renderEditingActions` trong registry. Fallback
 * generic khi type chưa đăng ký (chưa có concrete implementation, VD Board
 * mode element dùng generic).
 *
 * Trash luôn footer, chung 3 mode. Click tile creation = tạo tại tâm viewport;
 * kéo tile = tạo tại vị trí drop.
 */

/** Tính tâm viewport hiện tại quy về canvas-space. */
function viewportCenterCanvas(): { x: number; y: number } {
  const engine = getCameraEngine();
  const vp = engine.getViewport();
  const cam = engine.getCamera();
  return screenToCanvas({ x: vp.width / 2, y: vp.height / 2 }, cam);
}

/**
 * Convert điểm screen (clientX/Y) → canvas-space, chỉ nhận khi con trỏ nằm trên
 * vùng canvas surface (không phải toolbar/header).
 */
function dropPointToCanvas(clientX: number, clientY: number): { x: number; y: number } | null {
  if (hitZone(clientX, clientY) !== 'canvas') return null;
  return clientToCanvas(clientX, clientY, getCameraEngine().getCamera());
}

// ============================================================
// Creation mode (tile palette)
// ============================================================

// Tile chung cho creation mode. Có onPointerDown = real tile (drag/click tạo
// object). Không có = placeholder chưa gắn logic. JSX giống hệt.
function TileButton({
  tileType,
  label,
  onPointerDown,
}: {
  tileType: TileType;
  label: string;
  onPointerDown?: (e: ReactPointerEvent<HTMLElement>) => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={onPointerDown ? `Tạo ${label}` : label}
      onPointerDown={onPointerDown}
      className="group flex w-12 cursor-pointer flex-col items-center gap-1 rounded-lg py-1.5 text-muted-foreground transition-colors duration-[60ms] hover:bg-muted hover:text-foreground"
    >
      <TileIcon type={tileType} />
      <span className="text-[9px] font-medium leading-tight text-muted-foreground group-hover:text-foreground">
        {label}
      </span>
    </button>
  );
}

// Real tile: wrap useToolbarDrag để click tạo ở tâm viewport, kéo thả tạo tại
// vị trí drop.
function ToolTile({
  type,
  tileType,
  label,
  boardId,
  def,
}: {
  type: string;
  tileType: TileType;
  label: string;
  boardId: string;
  def: ReturnType<typeof getToolbarObjectTypes>[number];
}) {
  const create = (x: number, y: number) => {
    if (type === 'board') createBoardAt(x, y, boardId);
    else createObjectAt(type, x, y, boardId);
  };

  const { onPointerDown, preview } = useToolbarDrag({
    type,
    onClick: () => {
      const c = viewportCenterCanvas();
      create(c.x, c.y);
    },
    onDrop: (clientX, clientY) => {
      const c = dropPointToCanvas(clientX, clientY);
      if (c) create(c.x, c.y);
    },
    defaultGeometry: def.defaultGeometry,
    defaultData: def.defaultData,
  });

  return (
    <>
      <TileButton tileType={tileType} label={label} onPointerDown={onPointerDown} />
      {preview}
    </>
  );
}

const PLACEHOLDER_TYPES: { label: string; tileType: TileType }[] = [
  { label: 'Link', tileType: 'link' },
  { label: 'Image', tileType: 'image' },
  { label: 'To-do', tileType: 'todo' },
  { label: 'Table', tileType: 'table' },
  { label: 'File', tileType: 'file' },
  { label: 'Line', tileType: 'line' },
];

// Map từ registry type string → TileIcon type.
const REGISTRY_TO_TILE: Record<string, TileType> = {
  note: 'note',
  board: 'board',
};

function CreationTools({ boardId }: { boardId: string }) {
  const types = getToolbarObjectTypes();
  return (
    <>
      {types.map((def) => (
        <ToolTile
          key={def.type}
          type={def.type}
          tileType={REGISTRY_TO_TILE[def.type] ?? 'note'}
          label={def.label}
          boardId={boardId}
          def={def}
        />
      ))}
      {PLACEHOLDER_TYPES.map((p) => (
        <TileButton key={p.label} label={p.label} tileType={p.tileType} />
      ))}
    </>
  );
}

// ============================================================
// Element-selected mode (contextual actions)
// ============================================================

/**
 * Action button element/editing mode: h-10 w-10 (nhỏ hơn creation tile), không
 * label under icon (chỉ tooltip). Milanote parity compact style.
 *
 * Exported để per-type toolbar (VD NoteToolbar) import dùng, không cần
 * re-implement style.
 */
export function ActionButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: LucideIcon | ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  /** Highlight khi format đang apply (VD Bold trong đoạn đã bold). Editing mode
   *  wire qua Tiptap `editor.isActive(mark)`. Element mode chưa dùng — reserve. */
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Milanote parity toolbar: click button KHÔNG blur editor đang active
      // trong Note. preventDefault mousedown = browser không transfer focus,
      // ProseMirror giữ selection highlight visually + `onBlur` không fire.
      // Áp cho mọi ActionButton (element + editing mode); element mode không có
      // editor thì vô hại. DismissButton cố ý KHÔNG preventDefault — thoát edit
      // là ý định rõ ràng.
      onMouseDown={(e) => e.preventDefault()}
      title={label}
      aria-label={label}
      className={`grid h-10 w-10 place-items-center rounded-lg transition-colors duration-[60ms] hover:bg-muted hover:text-foreground ${
        active ? 'bg-muted text-foreground' : 'text-muted-foreground'
      }`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

// Dismiss button top của element/editing mode. Icon arrow-left, click chạy
// action truyền vào (element mode = clear selection về creation, editing mode
// = thoát edit về element).
function DismissButton({ onClick, label = 'Bỏ chọn' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="mb-1 flex h-8 w-10 items-center justify-center rounded-lg border-b border-border text-muted-foreground transition-colors duration-[60ms] hover:bg-muted hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}

/**
 * Generic element actions fallback khi type không đăng ký renderElementActions.
 * 4 placeholder button (Labels/Reactions/Comment/More) + Color icon placeholder.
 * Type có concrete implementation (VD Note) override qua registry.
 */
function GenericElementActions() {
  return (
    <>
      <ActionButton icon={Palette} label="Color" />
      <ActionButton icon={Tag} label="Labels" />
      <ActionButton icon={Smile} label="Reactions" />
      <ActionButton icon={MessageSquare} label="Comment" />
      <ActionButton icon={MoreHorizontal} label="More" />
    </>
  );
}

/**
 * Generic editing actions fallback. Bộ button text-format phổ biến (Milanote
 * parity DOM paste ban đầu). Type có editor riêng override qua registry.
 */
function GenericEditingActions() {
  return (
    <>
      <ActionButton icon={Type} label="Text style" />
      <ActionButton icon={Bold} label="Đậm" />
      <ActionButton icon={Italic} label="Nghiêng" />
      <ActionButton icon={List} label="Bulleted list" />
      <ActionButton icon={ListOrdered} label="Numbered list" />
      <ActionButton icon={LinkIcon} label="Link" />
      <ActionButton icon={MessageSquare} label="Comment" />
      <ActionButton icon={MoreHorizontal} label="More" />
    </>
  );
}

// ============================================================
// Root Toolbar
// ============================================================

export function Toolbar({ boardId }: { boardId: string }) {
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const objectsMap = useObjectsStore((s) => s.objects);
  const editingId = useInteractionStore((s) => s.editingId);
  const setEditingId = useInteractionStore((s) => s.setEditingId);
  const clearSelection = useSelectionStore((s) => s.clear);
  const hasSelection = selectedIds.size > 0;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const uiScale = useInterfaceScale();

  // Detect single-object selection để switch mode. Multi-select giữ creation
  // (element-actions cho multi = task Phase sau, cần semantic áp cho tất cả).
  const selectedObject = useMemo(() => {
    if (selectedIds.size !== 1) return null;
    const [id] = selectedIds;
    return objectsMap.get(id) ?? null;
  }, [selectedIds, objectsMap]);

  // Object đang edit (nếu có). Editing thường là object trong selection, nhưng
  // theo store là 2 field độc lập → tra riêng.
  const editingObject = useMemo(
    () => (editingId ? (objectsMap.get(editingId) ?? null) : null),
    [editingId, objectsMap],
  );

  // Priority: editing > element > creation. editingId set → mode='editing' bất
  // kể selection state.
  const mode: 'creation' | 'element' | 'editing' = editingObject
    ? 'editing'
    : selectedObject
      ? 'element'
      : 'creation';

  // Wheel trong toolbar → KHÔNG zoom/pan canvas. Surface attach native listener
  // passive:false + preventDefault → React synthetic stopPropagation không chặn
  // được. Native listener trên wrapper để stopPropagation trước bubble tới surface.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => e.stopPropagation();
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onTrash = () => {
    const ids = Array.from(useSelectionStore.getState().selectedIds);
    if (ids.length > 0) deleteObjects(ids);
  };

  return (
    // Khung ngoài: chỉ lo vị trí + chiều cao màn hình (cố định, không theo Kích thước giao diện).
    // pointer-events-none: khung này rộng theo layout chưa scale, phần thừa trong suốt không được chặn chuột.
    <div className="pointer-events-none absolute left-3 top-1/2 z-toolbar h-[calc(100vh-8rem)] -translate-y-1/2">
      <div
        ref={wrapperRef}
        data-canvas-overlay="true"
        // Height CỐ ĐỊNH (h, không phải max-h): cả 3 mode dài như nhau. Mode ít
        // button thì list flex-1 còn empty space bên dưới, không co toolbar ngắn.
        // Creation mode nhiều button tràn → list bên trong scroll. Trash footer
        // fixed height ở đáy.
        // Kích thước giao diện: layout ở cỡ gốc rồi scale (xem scaledFillStyle).
        style={scaledFillStyle(uiScale)}
        className="pointer-events-auto flex flex-col rounded-xl border border-border bg-card/90 shadow-lg backdrop-blur"
      >
        <div className="no-scrollbar flex flex-1 flex-col items-center gap-1.5 overflow-y-auto p-2">
          {mode === 'editing' && editingObject ? (
            <>
              <DismissButton onClick={() => setEditingId(null, null)} label="Thoát edit" />
              {getObjectTypeDefinition(editingObject.type)?.renderEditingActions?.(
                editingObject,
              ) ?? <GenericEditingActions />}
            </>
          ) : mode === 'element' && selectedObject ? (
            <>
              <DismissButton onClick={clearSelection} label="Bỏ chọn" />
              {getObjectTypeDefinition(selectedObject.type)?.renderElementActions?.(
                selectedObject,
              ) ?? <GenericElementActions />}
            </>
          ) : (
            <CreationTools boardId={boardId} />
          )}
        </div>
        {/* Trash sticky footer, chung 3 mode */}
        <div className="border-t border-border p-2">
          <button
            type="button"
            data-trash-drop="true"
            title="Xoá object đang chọn (kéo vào đây cũng được)"
            aria-label="Xoá object đang chọn"
            disabled={!hasSelection}
            onClick={onTrash}
            className="group flex w-12 flex-col items-center gap-1 rounded-lg py-1.5 text-muted-foreground transition-all duration-[80ms] hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
          >
            <Trash2 className="h-5 w-5" />
            <span className="text-[9px] font-medium leading-tight">Xoá</span>
          </button>
        </div>
      </div>
    </div>
  );
}
