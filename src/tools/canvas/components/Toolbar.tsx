import { StickyNote, Image as ImageIcon, Link as LinkIcon, Trash2 } from 'lucide-react';
import { getToolbarObjectTypes } from '../hooks/useObjectRegistry';
import { getCameraEngine } from '../engine/camera-engine';
import { screenToCanvas } from '../engine/coord';
import { createObjectAt, deleteObjects } from '../engine/actions';
import { useSelectionStore } from '../store/selection-store';
import { useToolbarDrag } from '../hooks/useToolbarDrag';

/**
 * Toolbar palette dọc (kiểu Milanote) — screen-space overlay trong canvas.
 * Click nút → tạo object ở TÂM viewport. Kéo nút → thả xuống canvas → tạo tại
 * vị trí thả (pointer-based drag, không HTML5 draggable vì nó nuốt click).
 * Trash → xoá object đang chọn.
 */

const ICON_BY_TYPE: Record<string, typeof StickyNote> = {
  note: StickyNote,
  image: ImageIcon,
  link: LinkIcon,
};

/** Tính tâm viewport hiện tại quy về canvas-space. */
function viewportCenterCanvas(): { x: number; y: number } {
  const engine = getCameraEngine();
  const vp = engine.getViewport();
  const cam = engine.getCamera();
  return screenToCanvas({ x: vp.width / 2, y: vp.height / 2 }, cam);
}

/** Convert điểm screen (clientX/Y) → canvas-space, dùng rect của surface. */
function clientToCanvas(clientX: number, clientY: number): { x: number; y: number } | null {
  const surface = document.querySelector('[data-canvas-surface]');
  if (!(surface instanceof HTMLElement)) return null;
  const rect = surface.getBoundingClientRect();
  // Ngoài vùng surface → không thả.
  if (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  ) {
    return null;
  }
  const cam = getCameraEngine().getCamera();
  return screenToCanvas({ x: clientX - rect.left, y: clientY - rect.top }, cam);
}

function ToolButton({
  type,
  label,
  Icon,
  boardId,
  def,
}: {
  type: string;
  label: string;
  Icon: typeof StickyNote;
  boardId: string | null;
  def: ReturnType<typeof getToolbarObjectTypes>[number];
}) {
  const { onPointerDown } = useToolbarDrag({
    onClick: () => {
      const c = viewportCenterCanvas();
      createObjectAt(type, c.x, c.y, boardId);
    },
    onDrop: (clientX, clientY) => {
      const c = clientToCanvas(clientX, clientY);
      if (c) createObjectAt(type, c.x, c.y, boardId);
    },
    defaultGeometry: def.defaultGeometry,
    renderPreview: def.renderPreview,
    label,
  });

  return (
    <button
      type="button"
      title={label}
      aria-label={`Tạo ${label}`}
      onPointerDown={onPointerDown}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-[60ms] hover:bg-muted hover:text-foreground"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

export function Toolbar({ boardId }: { boardId: string | null }) {
  const types = getToolbarObjectTypes();
  const hasSelection = useSelectionStore((s) => s.selectedIds.size > 0);

  const onTrash = () => {
    const ids = Array.from(useSelectionStore.getState().selectedIds);
    if (ids.length > 0) deleteObjects(ids);
  };

  return (
    <div
      data-canvas-overlay="true"
      className="absolute left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 rounded-xl border border-border bg-card/90 p-1.5 shadow-lg backdrop-blur"
    >
      {types.map((def) => (
        <ToolButton
          key={def.type}
          type={def.type}
          label={def.label}
          Icon={ICON_BY_TYPE[def.type] ?? StickyNote}
          boardId={boardId}
          def={def}
        />
      ))}
      <div className="my-0.5 h-px w-full bg-border" />
      <button
        type="button"
        data-trash-drop="true"
        title="Xoá object đang chọn (kéo vào đây cũng được)"
        aria-label="Xoá object đang chọn"
        disabled={!hasSelection}
        onClick={onTrash}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-all duration-[80ms] hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </div>
  );
}
