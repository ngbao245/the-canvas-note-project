import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { getCameraEngine } from '../engine/camera-engine';
import { axisRange } from '../engine/pan-bounds';
import type { Bounds } from '../engine/coord';
import type { Camera } from '../types';

/**
 * Thanh cuộn của mặt canvas (Milanote có: canvas là ô cuộn thật, xem handoff "Đo Milanote").
 *
 * Canvas bibo không cuộn bằng DOM mà bằng camera, nên thanh cuộn ở đây chỉ là chỉ báo
 * vẽ tay: tay cuộn cho biết màn đang ở đâu trong vùng tài liệu (`docBounds` của engine,
 * cùng vùng mà giới hạn pan dùng), dài theo tỉ lệ màn / tài liệu × zoom. Tài liệu × zoom
 * vừa màn thì ẩn trục đó. Kéo tay cuộn = pan chặn cứng (`engine.pan`), không kéo lố.
 *
 * Cùng kiểu với `OverlayScroll`: vạch mảnh nổi đè mép, mờ khi rảnh, hiện khi camera
 * dời (pan / zoom) hoặc trỏ vào, không chiếm chỗ.
 *
 * Ghi thẳng DOM trong listener camera (gọi mỗi khung vẽ), không qua state.
 */

type Axis = 'x' | 'y';

/** Khoảng hở 2 đầu rãnh. */
const TRACK_INSET = 6;
/** Góc dưới phải nhường cho thanh dọc (= bề rộng vùng bấm). */
const CORNER = 12;
const MIN_THUMB = 32;
const HIDE_DELAY = 800;

interface AxisGeometry {
  /** Toạ độ tay cuộn dọc rãnh (px). */
  pos: number;
  len: number;
  /** Camera dời bao nhiêu khi tay cuộn dời 1px (âm: kéo xuống thì camera giảm). */
  camPerPx: number;
}

export function CanvasScrollbars() {
  const xRef = useRef<HTMLDivElement>(null);
  const yRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const drag = useRef<{ axis: Axis; last: number } | null>(null);

  // Hiện CẢ HAI thanh rồi hẹn ẩn. Một chỗ duy nhất hẹn ẩn: thả tay kéo cũng đi qua đây,
  // nếu chỉ ẩn thanh vừa kéo thì thanh kia kẹt ở trạng thái hiện.
  const scheduleHide = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (drag.current) return;
      for (const el of [xRef.current, yRef.current]) if (el) delete el.dataset.active;
    }, HIDE_DELAY);
  }, []);
  const reveal = useCallback(() => {
    for (const el of [xRef.current, yRef.current]) if (el) el.dataset.active = 'true';
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    const engine = getCameraEngine();
    let lastCam: Camera | null = null;

    const render = (camera: Camera) => {
      const bounds = engine.getDocBounds();
      const view = engine.getViewport();
      writeAxis(xRef.current, 'x', axisGeometry('x', camera, bounds, view));
      writeAxis(yRef.current, 'y', axisGeometry('y', camera, bounds, view));
      // Chỉ hiện khi camera thật sự dời; vùng tài liệu giãn (kéo object) thì cập nhật im lặng.
      if (
        lastCam &&
        (lastCam.x !== camera.x || lastCam.y !== camera.y || lastCam.zoom !== camera.zoom)
      ) {
        reveal();
      }
      lastCam = camera;
    };

    render(engine.getCamera());
    const unsub = engine.subscribe((camera) => render(camera));
    return () => {
      unsub();
      window.clearTimeout(hideTimer.current);
    };
  }, [reveal]);

  const onPointerDown = (axis: Axis) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { axis, last: axis === 'x' ? e.clientX : e.clientY };
    reveal();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const now = d.axis === 'x' ? e.clientX : e.clientY;
    const deltaPx = now - d.last;
    d.last = now;
    if (deltaPx === 0) return;
    const engine = getCameraEngine();
    const g = axisGeometry(d.axis, engine.getCamera(), engine.getDocBounds(), engine.getViewport());
    if (!g) return;
    const dc = deltaPx * g.camPerPx;
    engine.pan(d.axis === 'x' ? { x: dc, y: 0 } : { x: 0, y: dc });
  };

  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    scheduleHide();
  };

  const handlers = (axis: Axis) => ({
    onPointerDown: onPointerDown(axis),
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onLostPointerCapture: endDrag,
  });

  return (
    <>
      {/* Vùng bấm 12px, vạch thấy được 6px sát mép. */}
      <div
        ref={yRef}
        aria-hidden="true"
        data-canvas-overlay="true"
        {...handlers('y')}
        style={{ display: 'none' }}
        className={`group/sb absolute right-0 top-0 z-toolbar flex w-3 justify-end pr-0.5 ${THUMB_CLS}`}
      >
        <span className={`h-full w-1.5 ${BAR_CLS}`} />
      </div>
      <div
        ref={xRef}
        aria-hidden="true"
        data-canvas-overlay="true"
        {...handlers('x')}
        style={{ display: 'none' }}
        className={`group/sb absolute bottom-0 left-0 z-toolbar flex h-3 items-end pb-0.5 ${THUMB_CLS}`}
      >
        <span className={`h-1.5 w-full ${BAR_CLS}`} />
      </div>
    </>
  );
}

const THUMB_CLS =
  'opacity-0 transition-opacity duration-normal ease-standard hover:opacity-100 data-[active=true]:opacity-100 motion-reduce:transition-none';
const BAR_CLS =
  'rounded-full bg-scrollbar-thumb transition-colors duration-normal ease-standard group-hover/sb:bg-scrollbar-thumb-hover';

/**
 * Hình học 1 trục. Phạm vi camera [lo, hi] lấy đúng từ `axisRange` (cùng công thức giới
 * hạn pan): camera = hi ↔ mép đầu tài liệu chạm mép màn, = lo ↔ mép cuối chạm mép màn.
 * Null = không cần thanh (chưa biết vùng / tài liệu × zoom không dài hơn màn).
 */
function axisGeometry(
  axis: Axis,
  camera: Camera,
  bounds: Bounds | null,
  view: { width: number; height: number },
): AxisGeometry | null {
  if (!bounds) return null;
  const viewLen = axis === 'x' ? view.width : view.height;
  const start = axis === 'x' ? bounds.x : bounds.y;
  const size = axis === 'x' ? bounds.width : bounds.height;
  const docLen = size * camera.zoom;
  if (viewLen <= 0 || docLen <= viewLen + 1) return null;

  const [lo, hi] = axisRange(start, size, camera.zoom, viewLen);
  // Thanh ngang chừa góc dưới phải cho thanh dọc, 2 thanh không chồng nhau.
  const corner = axis === 'x' ? CORNER : 0;
  const track = viewLen - TRACK_INSET * 2 - corner;
  const len = Math.max(MIN_THUMB, (viewLen / docLen) * track);
  const free = track - len;
  if (free <= 0) return null;

  const cam = axis === 'x' ? camera.x : camera.y;
  // Đang kéo lố: kẹp tay cuộn ở đầu rãnh thay vì vẽ ra ngoài.
  const progress = Math.min(1, Math.max(0, (hi - cam) / (hi - lo)));
  return { pos: TRACK_INSET + free * progress, len, camPerPx: -(hi - lo) / free };
}

function writeAxis(el: HTMLDivElement | null, axis: Axis, g: AxisGeometry | null): void {
  if (!el) return;
  if (!g) {
    el.style.display = 'none';
    return;
  }
  el.style.display = '';
  if (axis === 'x') {
    el.style.width = `${g.len}px`;
    el.style.transform = `translateX(${g.pos}px)`;
  } else {
    el.style.height = `${g.len}px`;
    el.style.transform = `translateY(${g.pos}px)`;
  }
}
