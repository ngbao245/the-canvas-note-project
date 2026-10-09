import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { getCameraEngine } from '../engine/camera-engine';
import { clientToCanvas } from '../engine/coord';
import { hitZone, isInvalidZone, isSecondaryZone } from '../lib/hit-test';
import { clipParagraphToNewNote } from '../engine/actions';
import { extractParagraphHtml } from '../lib/note-clip';
import { getObjectTypeDefinition } from '../hooks/useObjectRegistry';
import { setCursorOverride } from '@/lib/cursor-override';
import type { CanvasObject } from '../types';
import { FloatingObjectPreview } from './FloatingObjectPreview';

/**
 * CardClipper button — Milanote parity. Icon Card nhỏ ở bên phải Note khi user
 * hover 1 paragraph. Drag ra canvas → tạo Note mới chứa paragraph đó.
 *
 *   - Click bình thường (không drag) = no-op.
 *   - Drag → drop trên canvas: cut paragraph khỏi source, tạo note mới.
 *   - Alt+drag → drop: copy (giữ paragraph gốc).
 *   - Drop invalid (overlay/outside/trash/unsort): silent cancel.
 *
 * Preview theo pattern useToolbarDrag: FloatingObjectPreview với mock note
 * object body = paragraph HTML → visual giống hệt note mới sẽ tạo.
 */

const DRAG_THRESHOLD = 5;

// Icon Card SVG copy từ TileIcons (note type). Kích thước nhỏ hơn cho fit button 24x24.
function CardIcon() {
  return (
    <svg
      viewBox="0 0 32 24"
      style={{ width: 20, height: 'auto', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.16))' }}
      aria-hidden="true"
    >
      <rect fill="var(--card)" width="32" height="24" rx="3" />
      <path
        fill="var(--muted-foreground)"
        d="M5.75 5h20.5a.75.75 0 1 1 0 1.5H5.75a.75.75 0 0 1 0-1.5zm0 5h20.5a.75.75 0 1 1 0 1.5H5.75a.75.75 0 1 1 0-1.5zm0 5h18.1a.75.75 0 1 1 0 1.5H5.75a.75.75 0 1 1 0-1.5z"
      />
    </svg>
  );
}

interface PreviewState {
  clientX: number;
  clientY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  dim: boolean;
}

export function CardClipperButton({
  sourceId,
  paragraphIndex,
  top,
  sourceBody,
  sourceColor,
  boardId,
}: {
  sourceId: string;
  paragraphIndex: number;
  /** Y offset trong wrapper (px, screen-space vì đã match camera scale). */
  top: number;
  /** Body HTML hiện tại của Note gốc — dùng extract paragraph khi drag start. */
  sourceBody: string;
  /** Color hex của Note gốc (inherit cho note mới). */
  sourceColor: string | null;
  boardId: string | null;
}) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const paragraphHtml = extractParagraphHtml(sourceBody, paragraphIndex);
    if (!paragraphHtml) return;
    e.stopPropagation();

    startRef.current = { x: e.clientX, y: e.clientY };
    draggingRef.current = false;

    const def = getObjectTypeDefinition('note');
    if (!def) return;
    const zoom = getCameraEngine().getCamera().zoom;
    // Cursor center preview (không có grab point specific — user cầm icon nhỏ,
    // preview là note to hơn nhiều → center vào giữa preview cho tự nhiên).
    const grabOffsetX = (def.defaultGeometry.width * zoom) / 2;
    const grabOffsetY = (def.defaultGeometry.height * zoom) / 2;

    // Mock note object cho FloatingObjectPreview render.
    const mockObject: CanvasObject = {
      id: '__card_clipper_preview__',
      type: 'note',
      boardId: '', // preview không thuộc board nào
      geometry: {
        x: 0,
        y: 0,
        width: def.defaultGeometry.width,
        height: def.defaultGeometry.height,
        rotation: 0,
        zIndex: 0,
      },
      data: { body: paragraphHtml, color: sourceColor },
      unsortIndex: null,
    } as CanvasObject;

    const onMove = (ev: PointerEvent) => {
      const s = startRef.current;
      if (!s) return;
      if (!draggingRef.current) {
        const dx = ev.clientX - s.x;
        const dy = ev.clientY - s.y;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        draggingRef.current = true;
      }
      const zone = hitZone(ev.clientX, ev.clientY);
      setCursorOverride(isInvalidZone(zone) ? 'not-allowed' : null);
      setPreview({
        clientX: ev.clientX,
        clientY: ev.clientY,
        grabOffsetX,
        grabOffsetY,
        dim: isSecondaryZone(ev.clientX, ev.clientY),
      });
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      setCursorOverride(null);
      setPreview(null);
      startRef.current = null;
      draggingRef.current = false;
    };

    const onUp = (ev: PointerEvent) => {
      const wasDragging = draggingRef.current;
      cleanup();
      if (!wasDragging) return; // click no-op, chỉ drag mới clip
      if (hitZone(ev.clientX, ev.clientY) !== 'canvas') return; // drop invalid
      const c = clientToCanvas(ev.clientX, ev.clientY, getCameraEngine().getCamera());
      if (!c || !boardId) return;
      // Milanote parity: default Cut, Alt = Copy.
      const cut = !ev.altKey;
      clipParagraphToNewNote(sourceId, paragraphIndex, c.x, c.y, boardId, cut);
    };

    const onCancel = () => cleanup();

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);

    // Reference mockObject để không tree-shake khi build (used inside preview render).
    void mockObject;
  };

  const paragraphHtmlForPreview = extractParagraphHtml(sourceBody, paragraphIndex);

  return (
    <>
      <button
        type="button"
        data-card-clipper-button="true"
        onPointerDown={onPointerDown}
        title="Kéo để tách paragraph thành note mới (Alt = copy)"
        aria-label="Tách paragraph thành note mới"
        style={{ top, right: -32 }}
        className="absolute grid h-6 w-6 cursor-grab place-items-center rounded-md border border-border bg-card shadow-md transition-transform duration-fast hover:scale-110 active:cursor-grabbing"
      >
        <CardIcon />
      </button>
      {preview && paragraphHtmlForPreview ? (
        <FloatingObjectPreview
          object={
            {
              id: '__card_clipper_preview__',
              type: 'note',
              boardId: '',
              geometry: {
                x: 0,
                y: 0,
                width: getObjectTypeDefinition('note')?.defaultGeometry.width ?? 338,
                height: getObjectTypeDefinition('note')?.defaultGeometry.height ?? 68,
                rotation: 0,
                zIndex: 0,
              },
              data: { body: paragraphHtmlForPreview, color: sourceColor },
              unsortIndex: null,
            } as CanvasObject
          }
          clientX={preview.clientX}
          clientY={preview.clientY}
          grabOffsetX={preview.grabOffsetX}
          grabOffsetY={preview.grabOffsetY}
          dim={preview.dim}
        />
      ) : null}
    </>
  );
}
