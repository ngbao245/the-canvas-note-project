import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useInterfaceScale } from '@/stores/interface-store';

/**
 * Overlay primitive dùng chung cho các popup mở từ toolbar (element mode + editing
 * mode). Tách khỏi từng type toolbar để không lặp mechanic khi thêm popup mới.
 *
 * PORTAL ra `body` + `position: fixed`: toolbar bọc list trong `overflow-y-auto`
 * (để creation mode nhiều tile cuộn được). CSS ép `overflow-x` thành `auto` theo
 * trục y → popup đặt `left-full` (tràn sang phải) BỊ CẮT, chỉ ló vài px. Portal
 * đưa popup ra ngoài cây DOM của vùng cuộn nên không bị clip. Vị trí tính theo
 * rect của nút anchor (phần tử cha `.relative` bọc nút + popup).
 *
 * Định vị: bên phải nút, mép trên căn mép trên khung toolbar (`data-toolbar-root`),
 * mũi tên trỏ vào tâm nút. Sát
 * mép phải mà bên trái đủ chỗ → lật sang trái. Luôn kẹp trong viewport; cao hơn
 * viewport thì giới hạn max-height + cuộn. Đo lại khi popup đổi kích thước, cửa
 * sổ resize hoặc vùng cuộn của toolbar cuộn (nút anchor dịch theo).
 *
 * Ghi style TRỰC TIẾP lên DOM, không qua state: lúc đo phải gỡ max-height để lấy
 * chiều cao thật rồi gán lại ngay trong cùng 1 nhịp. Đi qua state thì ResizeObserver
 * thấy kích thước đổi qua lại giữa 2 lần commit → báo lặp.
 *
 * Tách 2 lớp: lớp ngoài (fixed, không overflow) chứa mũi tên; lớp trong mang
 * `className` của caller (có thể `overflow-y-auto`) → mũi tên không bị cắt.
 *
 * `data-canvas-overlay` là contract chung với NoteEditor `onBlur` guard +
 * `useToolbarPopupClose` (click-outside bỏ qua vùng này). Giữ nguyên trên node
 * portal để 2 cơ chế đó vẫn nhận ra popup.
 */

interface ToolbarPopupProps {
  /** Extend layout classes (VD 'flex w-40 flex-col gap-1 p-2'). Base class đã có
   *  surface + border. Positioning do portal lo, KHÔNG set left/top ở đây. */
  className?: string;
  children: ReactNode;
}

/** Khoảng cách tối thiểu tới mép viewport. */
const VIEWPORT_MARGIN = 8;
/** Mũi tên: rộng (nhô ra ngoài popup) và cao (dọc theo cạnh popup). */
const ARROW_W = 8;
const ARROW_H = 16;
/** Khe giữa nút và đầu mũi tên. */
const ANCHOR_GAP = 4;
/** Mũi tên không sát góc bo của popup (rounded-lg = 8px). */
const ARROW_EDGE_INSET = 8;

export const ToolbarPopup = forwardRef<HTMLDivElement, ToolbarPopupProps>(function ToolbarPopup(
  { className = '', children },
  ref,
) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  // Neo đo vị trí: span rỗng render tại chỗ (trong cây toolbar), parent của nó là
  // `.relative` bọc nút anchor.
  const anchorRef = useRef<HTMLSpanElement>(null);

  // forwardRef trỏ tới node ngoài cùng (hook click-outside cần `.contains`, gồm cả mũi tên).
  useImperativeHandle(ref, () => outerRef.current as HTMLDivElement, []);

  // Kích thước giao diện: toolbar scale bằng transform (scaledFillStyle). Popup ra
  // ngoài cây đó nên tự scale cùng tỉ lệ, gốc ở góc trên trái. Mọi số đo dưới đây:
  // vị trí `left/top` của lớp ngoài là px màn hình; kích thước, mũi tên bên trong là
  // px cục bộ (chưa nhân scale).
  const scale = useInterfaceScale();

  useLayoutEffect(() => {
    const anchorEl = anchorRef.current?.parentElement;
    const outer = outerRef.current;
    const inner = innerRef.current;
    const arrow = arrowRef.current;
    if (!anchorEl || !outer || !inner || !arrow) return;

    const place = () => {
      const r = anchorEl.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      const maxH = (vh - VIEWPORT_MARGIN * 2) / scale;

      // Gỡ giới hạn của lần trước để đo kích thước tự nhiên (vẫn tôn trọng
      // max-h của caller vì đó là class, không phải inline style). Gỡ rồi gán lại
      // làm mất vị trí cuộn → giữ lại scrollTop.
      const scrollTop = inner.scrollTop;
      inner.style.maxHeight = '';
      inner.style.overflowY = '';
      const w = inner.offsetWidth * scale;
      let hLocal = inner.offsetHeight;
      if (hLocal > maxH) {
        inner.style.maxHeight = `${maxH}px`;
        inner.style.overflowY = 'auto';
        hLocal = maxH;
      }
      inner.scrollTop = scrollTop;
      const h = hLocal * scale;

      // Ngang: phải trước, lật trái nếu tràn mà bên trái đủ chỗ, còn lại kẹp.
      const offset = (ANCHOR_GAP + ARROW_W) * scale;
      const rightLeft = r.right + offset;
      const leftLeft = r.left - offset - w;
      let side: 'right' | 'left' = 'right';
      let left = rightLeft;
      if (rightLeft + w > vw - VIEWPORT_MARGIN && leftLeft >= VIEWPORT_MARGIN) {
        side = 'left';
        left = leftLeft;
      }
      left = clamp(left, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, vw - VIEWPORT_MARGIN - w));

      // Dọc: mọi popup căn mép trên KHUNG TOOLBAR (bạn chốt 2026-10-16), không theo
      // từng nút → mở popup nào cũng cùng 1 hàng. Ngoài toolbar thì theo nút. Kẹp viewport.
      const toolbarEl = anchorEl.closest('[data-toolbar-root]');
      const baseTop = toolbarEl ? toolbarEl.getBoundingClientRect().top : r.top;
      const top = clamp(baseTop, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, vh - VIEWPORT_MARGIN - h));

      outer.style.left = `${left}px`;
      outer.style.top = `${top}px`;
      outer.style.transform = scale === 1 ? '' : `scale(${scale})`;
      outer.style.visibility = 'visible';

      // Mũi tên trỏ tâm dọc của nút, không vượt góc bo (tính theo px cục bộ).
      const anchorCenterY = (r.top + r.height / 2 - top) / scale;
      const arrowTop = clamp(
        anchorCenterY - ARROW_H / 2,
        ARROW_EDGE_INSET,
        Math.max(ARROW_EDGE_INSET, hLocal - ARROW_EDGE_INSET - ARROW_H),
      );
      arrow.style.top = `${arrowTop}px`;
      // Lùi 1px vào trong để phần fill che đoạn viền popup dưới chân mũi tên.
      if (side === 'right') {
        arrow.style.left = `${-ARROW_W + 1}px`;
        arrow.style.right = '';
        arrow.style.transform = '';
      } else {
        arrow.style.left = '';
        arrow.style.right = `${-ARROW_W + 1}px`;
        arrow.style.transform = 'scaleX(-1)';
      }
    };

    place();
    const ro = new ResizeObserver(place);
    ro.observe(inner);
    window.addEventListener('resize', place);
    // capture: bắt cả scroll của vùng cuộn trong toolbar (scroll không bubble). Cuộn
    // bên trong chính popup không dời nút anchor → bỏ qua.
    const onScroll = (e: Event) => {
      if (e.target instanceof Node && outer.contains(e.target)) return;
      place();
    };
    window.addEventListener('scroll', onScroll, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [scale]);

  return (
    <>
      <span ref={anchorRef} className="hidden" aria-hidden="true" />
      {createPortal(
        <div
          ref={outerRef}
          data-canvas-overlay="true"
          // visibility hidden tới khi place() chạy (trước paint) → không chớp ở 0,0.
          style={{ position: 'fixed', left: 0, top: 0, visibility: 'hidden', transformOrigin: '0 0' }}
          className="z-toolbar"
        >
          <div
            ref={innerRef}
            className={`rounded-lg border border-border bg-card shadow-lg ${className}`}
          >
            {children}
          </div>
          <svg
            ref={arrowRef}
            width={ARROW_W}
            height={ARROW_H}
            viewBox={`0 0 ${ARROW_W} ${ARROW_H}`}
            aria-hidden="true"
            className="pointer-events-none absolute"
          >
            <path d={`M${ARROW_W} 0 L1 ${ARROW_H / 2} L${ARROW_W} ${ARROW_H} Z`} className="fill-card" />
            <path
              d={`M${ARROW_W} 0 L1 ${ARROW_H / 2} L${ARROW_W} ${ARROW_H}`}
              className="fill-none stroke-border"
              strokeWidth={1}
            />
          </svg>
        </div>,
        document.body,
      )}
    </>
  );
});

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}
