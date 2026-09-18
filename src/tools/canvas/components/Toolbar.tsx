import { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
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
 *
 * Icons dùng SVG Milanote-style (paper + line pattern) copy từ mockup 04-canvas,
 * đọc màu qua CSS var (--card, --muted-foreground, --primary) để follow theme +
 * ui-style (drawably/flat) tự nhiên.
 */

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

// ============================================================
// Tile icons — SVG paper + line style từ mockup 04-canvas.html.
// Paper fill dùng var(--card) để follow theme (dark = card đậm, light = trắng).
// Line dùng var(--muted-foreground). Board dùng var(--primary).
// ============================================================

type TileType =
  | 'note'
  | 'link'
  | 'image'
  | 'todo'
  | 'board'
  | 'table'
  | 'file'
  | 'line';

function TileIcon({ type }: { type: TileType }) {
  // 24x18 giữ aspect 4:3 của paper, fit trong nút 40x40.
  const paper = 'var(--card)';
  const line = 'var(--muted-foreground)';
  // Icon 32px width theo mockup 04 comp-tile (.el-icon svg width: 32px).
  const style: React.CSSProperties = {
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.16))',
    width: '32px',
    height: 'auto',
  };

  switch (type) {
    case 'note':
      return (
        <svg viewBox="0 0 32 24" style={style}>
          <rect fill={paper} width="32" height="24" rx="3" />
          <path
            fill={line}
            d="M5.75 5h20.5a.75.75 0 1 1 0 1.5H5.75a.75.75 0 0 1 0-1.5zm0 5h20.5a.75.75 0 1 1 0 1.5H5.75a.75.75 0 1 1 0-1.5zm0 5h18.1a.75.75 0 1 1 0 1.5H5.75a.75.75 0 1 1 0-1.5z"
          />
        </svg>
      );
    case 'link':
      return (
        <svg viewBox="0 0 32 24" style={style}>
          <rect fill={paper} width="32" height="24" rx="3" />
          <path
            fill={line}
            fillRule="nonzero"
            d="M17.986 10.014a4.285 4.285 0 0 1 0 6.06l-1.67 1.67a4.285 4.285 0 0 1-6.06-6.06.741.741 0 0 1 1.048 1.05 2.802 2.802 0 0 0 3.963 3.962l1.67-1.67a2.802 2.802 0 0 0 0-3.964.741.741 0 1 1 1.049-1.048zm3.759-3.759a4.285 4.285 0 0 1 0 6.06.741.741 0 0 1-1.049-1.048 2.802 2.802 0 0 0-3.963-3.963l-1.67 1.67a2.802 2.802 0 0 0 0 3.964.741.741 0 1 1-1.049 1.048 4.285 4.285 0 0 1 0-6.06l1.67-1.67a4.285 4.285 0 0 1 6.06 0z"
          />
        </svg>
      );
    case 'image':
      return (
        <svg viewBox="0 0 32 24" style={style}>
          <rect fill={paper} width="32" height="24" rx="3" />
          <circle fill={line} cx="10" cy="9" r="2.5" />
          <path fill={line} d="M4 20l6-6 4 3 5-5 9 8H4z" />
        </svg>
      );
    case 'todo':
      return (
        <svg viewBox="0 0 32 24" style={style}>
          <rect fill={paper} width="32" height="24" rx="3" />
          <path
            fill={line}
            d="M6.28 7.77a.75.75 0 0 0-1.06 1.06l1.5 1.5a.75.75 0 0 0 1.06 0l3-3a.75.75 0 0 0-1.06-1.06L7.25 8.74l-.97-.97zm0 6.5a.75.75 0 0 0-1.06 1.06l1.5 1.5a.75.75 0 0 0 1.06 0l3-3a.75.75 0 0 0-1.06-1.06l-2.47 2.47-.97-.97zM14.75 8h11.3a.75.75 0 1 1 0 1.5h-11.3a.75.75 0 1 1 0-1.5zm0 6.4h11.3a.75.75 0 1 1 0 1.5h-11.3a.75.75 0 1 1 0-1.5z"
          />
        </svg>
      );
    case 'board':
      return (
        <svg viewBox="0 0 32 32" style={{ ...style, width: '28px' }}>
          <rect fill="var(--primary)" width="32" height="32" rx="8" />
          <rect width="7" height="7" x="8" y="8" fill="#fff" rx="2" />
          <rect width="7" height="7" x="8" y="17" fill="#fff" fillOpacity="0.75" rx="2" />
          <rect width="7" height="7" x="17" y="8" fill="#fff" fillOpacity="0.35" rx="3.5" />
          <rect width="7" height="7" x="17" y="17" fill="#fff" fillOpacity="0.55" rx="2" />
        </svg>
      );
    case 'table':
      return (
        <svg viewBox="0 0 32 24" style={style}>
          <rect fill={paper} width="32" height="24" rx="3" />
          <path
            stroke={line}
            fill="none"
            strokeWidth="1.5"
            d="M4 6h9M4 10h9M4 14h7M18 6h10M18 10h10M18 14h8"
          />
        </svg>
      );
    case 'file':
      return (
        <svg viewBox="0 0 32 24" style={style}>
          <path
            fill={paper}
            d="M6 1h13l7 7v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z"
          />
          <path fill={line} opacity="0.4" d="M19 1v6a1 1 0 0 0 1 1h6" />
          <path
            fill={line}
            d="M9 13h11a.6.6 0 1 1 0 1.2H9A.6.6 0 1 1 9 13zm0 4h11a.6.6 0 1 1 0 1.2H9A.6.6 0 1 1 9 17z"
          />
        </svg>
      );
    case 'line':
      return (
        <svg viewBox="0 0 32 28" style={style}>
          <path
            fill={line}
            fillRule="evenodd"
            d="m30.385 0-3 8-1.793-1.793-21.5 21.5a1 1 0 0 1-1.32.083l-.094-.083a1 1 0 0 1 0-1.414L24.177 4.792 22.385 3l8-3z"
          />
        </svg>
      );
  }
}

// ============================================================
// Buttons
// ============================================================

function ToolButton({
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
      className="group flex w-12 cursor-pointer flex-col items-center gap-0.5 rounded-lg py-1.5 text-muted-foreground transition-colors duration-[60ms] hover:bg-muted hover:text-foreground"
    >
      <TileIcon type={tileType} />
      <span className="text-[9px] font-medium leading-tight text-muted-foreground group-hover:text-foreground">
        {label}
      </span>
    </button>
  );
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

function PlaceholderButton({ label, tileType }: { label: string; tileType: TileType }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="group flex w-12 cursor-pointer flex-col items-center gap-0.5 rounded-lg py-1.5 text-muted-foreground transition-colors duration-[60ms] hover:bg-muted hover:text-foreground"
    >
      <TileIcon type={tileType} />
      <span className="text-[9px] font-medium leading-tight text-muted-foreground group-hover:text-foreground">
        {label}
      </span>
    </button>
  );
}

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
          <ToolButton
            key={def.type}
            type={def.type}
            tileType={REGISTRY_TO_TILE[def.type] ?? 'note'}
            label={def.label}
            boardId={boardId}
            def={def}
          />
        ))}
        {PLACEHOLDER_TYPES.map((p) => (
          <PlaceholderButton key={p.label} label={p.label} tileType={p.tileType} />
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
