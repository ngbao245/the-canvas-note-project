import { useEffect, useState } from 'react';
import { getCameraEngine } from '@/tools/canvas/engine/camera-engine';
import type { Camera } from '@/tools/canvas/types';

/**
 * Dòng toạ độ canvas trên bảng dev (bạn yêu cầu 2026-10-15). Toạ độ canvas-space
 * (đơn vị lưu trong geometry object), không phải pixel màn.
 * - chuột: điểm dưới con trỏ, chỉ khi con trỏ đang trên mặt canvas.
 * - tâm: điểm ở giữa màn canvas.
 * Gom cập nhật vào 1 khung hình, không render lại theo từng sự kiện chuột.
 */

interface Readout {
  pointer: { x: number; y: number } | null;
  center: { x: number; y: number };
  zoom: number;
}

export function CanvasCoordsReadout() {
  const [r, setR] = useState<Readout | null>(null);

  useEffect(() => {
    const engine = getCameraEngine();
    let screen: { x: number; y: number } | null = null;
    let raf: number | null = null;

    const compute = () => {
      raf = null;
      const surface = document.querySelector<HTMLElement>('[data-canvas-surface]');
      if (!surface) {
        setR(null);
        return;
      }
      const cam: Camera = engine.getCamera();
      const vp = engine.getViewport();
      const rect = surface.getBoundingClientRect();
      let pointer: Readout['pointer'] = null;
      if (
        screen &&
        screen.x >= rect.left &&
        screen.x <= rect.right &&
        screen.y >= rect.top &&
        screen.y <= rect.bottom
      ) {
        pointer = {
          x: (screen.x - rect.left - cam.x) / cam.zoom,
          y: (screen.y - rect.top - cam.y) / cam.zoom,
        };
      }
      setR({
        pointer,
        center: { x: (vp.width / 2 - cam.x) / cam.zoom, y: (vp.height / 2 - cam.y) / cam.zoom },
        zoom: engine.getBoardZoom(),
      });
    };
    const schedule = () => {
      if (raf === null) raf = requestAnimationFrame(compute);
    };
    const onMove = (e: PointerEvent) => {
      screen = { x: e.clientX, y: e.clientY };
      schedule();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    const unsub = engine.subscribe(schedule);
    schedule();
    return () => {
      window.removeEventListener('pointermove', onMove);
      unsub();
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  if (!r) return null;
  return (
    <div className="flex items-center gap-3 border-t border-border px-3 py-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">
      <span>
        chuột <span className="text-foreground">{r.pointer ? fmt(r.pointer) : '—'}</span>
      </span>
      <span>
        tâm <span className="text-foreground">{fmt(r.center)}</span>
      </span>
      <span className="ml-auto text-foreground">{Math.round(r.zoom * 100)}%</span>
    </div>
  );
}

function fmt(p: { x: number; y: number }): string {
  return `${Math.round(p.x)}, ${Math.round(p.y)}`;
}
