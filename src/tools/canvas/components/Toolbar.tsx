import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  ArrowLeft,
  MessageSquare,
  MoreHorizontal,
  Palette,
  Smile,
  Tag,
  Trash2,
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
import { useHeaderStyle } from '@/stores/canvas-settings-store';
import { ISLANDS_EDGE, islandsTopInset } from '../lib/header-islands';
import { useI18n, type MessageKey } from '@/lib/i18n';

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
  const { t } = useI18n();
  return (
    <button
      type="button"
      title={label}
      aria-label={onPointerDown ? t('CANVAS.TOOLBAR.CREATE', { label }) : label}
      onPointerDown={onPointerDown}
      className="group flex w-12 flex-col items-center gap-1 rounded-lg py-1.5 text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
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

// Placeholder tile chưa gắn logic. Lưu labelKey, dịch lúc render (hằng ngoài
// component chạy 1 lần, lưu chữ thì đổi ngôn ngữ không cập nhật).
const PLACEHOLDER_TYPES: { labelKey: MessageKey; tileType: TileType }[] = [
  { labelKey: 'CANVAS.TOOLBAR.TILE.LINK', tileType: 'link' },
  { labelKey: 'CANVAS.TOOLBAR.TILE.IMAGE', tileType: 'image' },
  { labelKey: 'CANVAS.TOOLBAR.TILE.TODO', tileType: 'todo' },
  { labelKey: 'CANVAS.TOOLBAR.TILE.TABLE', tileType: 'table' },
  { labelKey: 'CANVAS.TOOLBAR.TILE.FILE', tileType: 'file' },
  { labelKey: 'CANVAS.TOOLBAR.TILE.LINE', tileType: 'line' },
];

// Map từ registry type string → TileIcon type.
const REGISTRY_TO_TILE: Record<string, TileType> = {
  note: 'note',
  board: 'board',
};

function CreationTools({ boardId }: { boardId: string }) {
  const { t } = useI18n();
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
        <TileButton key={p.labelKey} label={t(p.labelKey)} tileType={p.tileType} />
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
  disabled,
  title,
  iconNode,
}: {
  icon: LucideIcon | ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  /** Highlight khi format đang apply (VD Bold trong đoạn đã bold). Editing mode
   *  wire qua Tiptap `editor.isActive(mark)`. Element mode chưa dùng — reserve. */
  active?: boolean;
  /** Nút chưa làm được (Labels/Reactions/Comment/Convert): mờ, không bấm, tooltip
   *  báo lý do. aria-disabled để con trỏ not-allowed tự áp (rule cursor). */
  disabled?: boolean;
  /** Tooltip riêng (VD nút disabled báo "sắp ra mắt"). Thiếu → dùng label. */
  title?: string;
  /** Vẽ icon riêng thay cho `icon` (VD nút Màu note xem trước màu hiện tại). */
  iconNode?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
      // Milanote parity toolbar: click button KHÔNG blur editor đang active
      // trong Note. preventDefault mousedown = browser không transfer focus,
      // ProseMirror giữ selection highlight visually + `onBlur` không fire.
      // Áp cho mọi ActionButton (element + editing mode); element mode không có
      // editor thì vô hại. DismissButton cố ý KHÔNG preventDefault — thoát edit
      // là ý định rõ ràng.
      onMouseDown={(e) => e.preventDefault()}
      title={title ?? label}
      aria-label={label}
      className={`grid h-10 w-10 place-items-center rounded-lg transition-colors duration-fast ${
        disabled
          ? 'text-muted-foreground opacity-40'
          : `hover:bg-muted hover:text-foreground ${active ? 'bg-muted text-foreground' : 'text-muted-foreground'}`
      }`}
    >
      {iconNode ?? <Icon className="h-5 w-5" />}
    </button>
  );
}

/**
 * ActionButton mở / đóng 1 popup (Màu, Icon, More, Text style, Link). Bọc `.relative`
 * vì ToolbarPopup đo vị trí theo phần tử cha này. Popup tự gọi `close` (chọn xong,
 * bấm ra ngoài). `label` cũng là `anchorLabel` của useToolbarPopupClose trong popup.
 */
export function PopupActionButton({
  icon,
  label,
  iconNode,
  active,
  renderPopup,
}: {
  icon: LucideIcon | ComponentType<{ className?: string }>;
  label: string;
  iconNode?: ReactNode;
  /** Sáng nút cả khi popup đóng (VD con trỏ đang trong link). */
  active?: boolean;
  renderPopup: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <ActionButton
        icon={icon}
        iconNode={iconNode}
        label={label}
        active={open || active}
        onClick={() => setOpen((o) => !o)}
      />
      {open ? renderPopup(() => setOpen(false)) : null}
    </div>
  );
}

// Dismiss button top của element/editing mode. Icon arrow-left, click chạy
// action truyền vào (element mode = clear selection về creation, editing mode
// = thoát edit về element).
function DismissButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="mb-1 flex h-8 w-10 items-center justify-center rounded-lg border-b border-border text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
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
  const { t } = useI18n();
  return (
    <>
      <ActionButton icon={Palette} label={t('CANVAS.TOOLBAR.COLOR')} />
      <ActionButton icon={Tag} label={t('CANVAS.NOTE_TOOLBAR.LABELS')} />
      <ActionButton icon={Smile} label={t('CANVAS.NOTE_TOOLBAR.REACTIONS')} />
      <ActionButton icon={MessageSquare} label={t('CANVAS.NOTE_TOOLBAR.COMMENT')} />
      <ActionButton icon={MoreHorizontal} label={t('CANVAS.NOTE_TOOLBAR.MORE')} />
    </>
  );
}

// ============================================================
// Root Toolbar
// ============================================================

export function Toolbar({ boardId }: { boardId: string }) {
  const { t } = useI18n();
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const objectsMap = useObjectsStore((s) => s.objects);
  const editingId = useInteractionStore((s) => s.editingId);
  const setEditingId = useInteractionStore((s) => s.setEditingId);
  const clearSelection = useSelectionStore((s) => s.clear);
  const hasSelection = selectedIds.size > 0;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const uiScale = useInterfaceScale();
  const islands = useHeaderStyle() === 'islands';

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

  // Priority: editing > element > creation. Chỉ vào editing khi loại đó có nút
  // sửa riêng (Note). Board sửa tên tại chỗ → toolbar giữ element (Milanote).
  const editingHasActions = editingObject
    ? Boolean(getObjectTypeDefinition(editingObject.type)?.renderEditingActions)
    : false;
  const mode: 'creation' | 'element' | 'editing' = editingObject && editingHasActions
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
    // Header đảo nổi: canvas phủ cả màn → bám từ dưới hàng đảo tới cách đáy 12px, không căn giữa
    // (căn giữa thì đầu thanh đè lên đảo trái).
    <div
      className={
        islands
          ? 'pointer-events-none absolute left-3 z-toolbar'
          : 'pointer-events-none absolute left-3 top-1/2 z-toolbar h-[calc(100vh-8rem)] -translate-y-1/2'
      }
      style={islands ? { top: islandsTopInset(uiScale), bottom: ISLANDS_EDGE } : undefined}
    >
      <div
        ref={wrapperRef}
        data-canvas-overlay="true"
        // ToolbarPopup căn mép trên popup theo khung này.
        data-toolbar-root="true"
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
              <DismissButton
                onClick={() => setEditingId(null, null)}
                label={t('CANVAS.TOOLBAR.EXIT_EDIT')}
              />
              {getObjectTypeDefinition(editingObject.type)?.renderEditingActions?.(editingObject)}
            </>
          ) : mode === 'element' && selectedObject ? (
            <>
              <DismissButton onClick={clearSelection} label={t('CANVAS.TOOLBAR.DESELECT')} />
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
            title={t('CANVAS.TOOLBAR.TRASH')}
            aria-label={t('CANVAS.TOOLBAR.TRASH_LABEL')}
            disabled={!hasSelection}
            onClick={onTrash}
            className="group flex w-12 flex-col items-center gap-1 rounded-lg py-1.5 text-muted-foreground transition-all duration-fast hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
          >
            <Trash2 className="h-5 w-5" />
            <span className="text-[9px] font-medium leading-tight">{t('CANVAS.TOOLBAR.TRASH_SHORT')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
