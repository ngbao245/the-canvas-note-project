import { useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { StickyNote } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { isMacSecondaryClick } from '@/lib/shortcuts';
import { FOCUS_RING } from '@/lib/focus-ring';
import { useDemoStore } from './demo-store';
import { screenToWorld } from './demo-camera';

const NOTE_W = 240;
const NOTE_H = 140;
const DRAG_THRESHOLD = 4;
let nextId = 0;

/**
 * Thanh công cụ dọc của canvas mini: 1 tile Note.
 * Bấm = thêm note giữa khung. Kéo = note bám con trỏ (lớp nổi), thả trên mặt canvas
 * thì tạo đúng chỗ thả, thả ngoài thì bỏ.
 * Lớp nổi cập nhật vị trí thẳng vào DOM, không render lại React mỗi lần di chuột.
 */
export function DemoToolbar({ surfaceRef }: { surfaceRef: RefObject<HTMLDivElement | null> }) {
  const { t } = useI18n();
  const [ghostOn, setGhostOn] = useState(false);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ pointerId: number; startX: number; startY: number; moved: boolean } | null>(
    null,
  );

  const createAt = (clientX: number, clientY: number) => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    const store = useDemoStore.getState();
    const p = screenToWorld(store.camera, clientX - rect.left, clientY - rect.top);
    const id = `note-new-${Date.now()}-${nextId++}`;
    store.addObject({
      id,
      x: p.x - NOTE_W / 2,
      y: p.y - NOTE_H / 2,
      w: NOTE_W,
      h: NOTE_H,
      title: t('LANDING.DEMO.NEW_NOTE_TITLE'),
      body: '',
    });
    store.startEdit(id);
  };

  const placeGhost = (clientX: number, clientY: number) => {
    const el = ghostRef.current;
    if (!el) return;
    const zoom = useDemoStore.getState().camera.zoom;
    el.style.width = `${NOTE_W * zoom}px`;
    el.style.height = `${NOTE_H * zoom}px`;
    el.style.transform = `translate3d(${clientX - (NOTE_W * zoom) / 2}px, ${clientY - (NOTE_H * zoom) / 2}px, 0) scale(1.04)`;
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || isMacSecondaryClick(e)) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    useDemoStore.getState().finishEdit();
    drag.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return;
      d.moved = true;
      setGhostOn(true);
    }
    placeGhost(e.clientX, e.clientY);
  };

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    setGhostOn(false);
    const surface = surfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    if (!d.moved) {
      createAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return;
    }
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (inside) createAt(e.clientX, e.clientY);
  };

  const onPointerCancel = () => {
    drag.current = null;
    setGhostOn(false);
  };

  // Bàn phím: Enter / Space trên nút → thêm note giữa khung (click không qua pointer).
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (e.detail !== 0) return; // click chuột đã xử ở pointerup
    const surface = surfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    createAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  return (
    <>
      <div className="absolute left-3 top-3 z-toolbar flex flex-col gap-1 rounded-lg border border-border bg-card p-1.5 shadow-elevation-1">
        <button
          type="button"
          title={t('LANDING.DEMO.ADD_NOTE_TITLE')}
          aria-label={t('LANDING.DEMO.ADD_NOTE_TITLE')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClick={onClick}
          className={`flex h-12 w-12 cursor-grab touch-none flex-col items-center justify-center gap-0.5 rounded-md text-foreground transition-colors duration-fast ease-standard hover:bg-muted active:scale-[0.98] active:brightness-95 ${FOCUS_RING}`}
        >
          <StickyNote className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] leading-none">Note</span>
        </button>
      </div>
      {ghostOn &&
        createPortal(
          <div
            ref={(el) => {
              ghostRef.current = el;
              if (el && drag.current) placeGhost(drag.current.startX, drag.current.startY);
            }}
            aria-hidden="true"
            className="pointer-events-none fixed left-0 top-0 z-drag-layer overflow-hidden rounded-sm border border-border bg-card"
            style={{ boxShadow: 'var(--shadow-elevation-3)', opacity: 0.85 }}
          >
            <div className="h-1 w-full bg-primary" />
          </div>,
          document.body,
        )}
    </>
  );
}
