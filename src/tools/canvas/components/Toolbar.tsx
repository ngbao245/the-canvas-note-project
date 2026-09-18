import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { getToolbarObjectTypes } from '../hooks/useObjectRegistry';
import { getCameraEngine } from '../engine/camera-engine';
import { screenToCanvas, clientToCanvas } from '../engine/coord';
import { hitZone } from '../lib/hit-test';
import { createObjectAt, deleteObjects } from '../engine/actions';
import { useSelectionStore } from '../store/selection-store';
import { useToolbarDrag } from '../hooks/useToolbarDrag';
import { TileIcon, type TileType } from './TileIcons';

/**
 * Toolbar palette dọc (kiểu Milanote) — screen-space overlay trong canvas.
 * Click nút → tạo object ở TÂM viewport. Kéo nút → thả xuống canvas → tạo tại
 * vị trí thả (pointer-based drag, không HTML5 draggable vì nó nuốt click).
 * Trash → xoá object đang chọn. Icon tile ở TileIcons.tsx.
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
 * vùng canvas surface (không phải toolbar/header). Dùng hitZone để guard vùng
 * rồi clientToCanvas (engine/coord) để tính toạ độ.
 */
function dropPointToCanvas(clientX: number, clientY: number): { x: number; y: number } | null {
  if (hitZone(clientX, clientY) !== 'canvas') return null;
  return clientToCanvas(clientX, clientY, getCameraEngine().getCamera());
}

// ============================================================
// Buttons
// ============================================================

// Tile chung của palette. Có onPointerDown (real tile — drag/click tạo object)
// hoặc không (placeholder chưa gắn logic). JSX giống hệt nhau.
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
      className="group flex w-12 cursor-pointer flex-col items-center gap-0.5 rounded-lg py-1.5 text-muted-foreground transition-colors duration-[60ms] hover:bg-muted hover:text-foreground"
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
  boardId: string | null;
  def: ReturnType<typeof getToolbarObjectTypes>[number];
}) {
  const { onPointerDown } = useToolbarDrag({
    onClick: () => {
      const c = viewportCenterCanvas();
      createObjectAt(type, c.x, c.y, boardId);
    },
    onDrop: (clientX, clientY) => {
      const c = dropPointToCanvas(clientX, clientY);
      if (c) createObjectAt(type, c.x, c.y, boardId);
    },
    defaultGeometry: def.defaultGeometry,
    renderPreview: def.renderPreview,
    label,
  });

  return <TileButton tileType={tileType} label={label} onPointerDown={onPointerDown} />;
}

const PLACEHOLDER_TYPES: { label: string; tileType: TileType }[] = [
  { label: 'Link', tileType: 'link' },
  { label: 'Image', tileType: 'image' },
  { label: 'To-do', tileType: 'todo' },
  { label: 'Board', tileType: 'board' },
  { label: 'Table', tileType: 'table' },
  { label: 'File', tileType: 'file' },
  { label: 'Line', tileType: 'line' },
];

// Map từ registry type string → TileIcon type. Registry hiện chỉ có 'note'.
const REGISTRY_TO_TILE: Record<string, TileType> = {
  note: 'note',
};

export function Toolbar({ boardId }: { boardId: string | null }) {
  const types = getToolbarObjectTypes();
  const hasSelection = useSelectionStore((s) => s.selectedIds.size > 0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Wheel trong toolbar → KHÔNG zoom/pan canvas. Surface attach native listener
  // với passive:false + preventDefault → React synthetic stopPropagation không
  // chặn được. Cần attach native listener trên wrapper để stopPropagation trước
  // khi event bubble lên surface. Browser vẫn scroll list bên trong nếu overflow.
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
    <div
      ref={wrapperRef}
      data-canvas-overlay="true"
      // max-h calc viewport - header(~80px) - margin(~48px). Vượt max-h thì list
      // tile scroll bên trong, trash sticky ở đáy shell.
      className="absolute left-3 top-1/2 z-20 flex max-h-[calc(100vh-8rem)] -translate-y-1/2 flex-col rounded-xl border border-border bg-card/90 shadow-lg backdrop-blur"
    >
      {/* List tile scroll khi dài (mockup 04 .side-scroll pattern) */}
      <div className="no-scrollbar flex flex-col gap-1.5 overflow-y-auto p-2">
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
      </div>
      {/* Trash sticky ở đáy shell, không scroll cùng list */}
      <div className="border-t border-border p-2">
      <button
        type="button"
        data-trash-drop="true"
        title="Xoá object đang chọn (kéo vào đây cũng được)"
        aria-label="Xoá object đang chọn"
        disabled={!hasSelection}
        onClick={onTrash}
        className="group flex w-12 flex-col items-center gap-0.5 rounded-lg py-1.5 text-muted-foreground transition-all duration-[80ms] hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
      >
        <Trash2 className="h-5 w-5" />
        <span className="text-[9px] font-medium leading-tight">Xoá</span>
      </button>
      </div>
    </div>
  );
}
