import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type UIEvent,
} from 'react';

/**
 * Vùng cuộn dọc có thanh cuộn tự vẽ (kiểu Milanote).
 *
 * Vì sao không dùng thanh cuộn của trình duyệt: trên Windows, thanh cuộn hệ thống
 * (bật "Always show scrollbars" hoặc chế độ thanh cuộn riêng của Chrome / Edge) vẫn
 * hiện nút mũi tên và dày mỏng khác nhau giữa máy, CSS `::-webkit-scrollbar` không
 * gỡ được chắc chắn. Ở đây thanh cuộn gốc bị giấu (`no-scrollbar`), cuộn bằng lăn
 * chuột / touchpad / bàn phím vẫn của trình duyệt; tay cuộn là 1 div nổi đè lên mép
 * phải, không chiếm chỗ, giống nhau trên mọi máy.
 *
 * Tay cuộn hiện khi trỏ vào vùng, khi đang cuộn và khi đang kéo; rảnh thì mờ dần.
 * Kéo tay cuộn để cuộn. Chỉ cuộn dọc (ngang bị ẩn, chưa nơi nào cần).
 *
 * Bố cục: khung ngoài (`className`) là cột flex, vùng cuộn bên trong `flex-1`.
 *   - Khung có chiều cao (VD `min-h-0 flex-1` trong cột flex, `h-56`): vùng cuộn lấp đầy.
 *   - Chỉ giới hạn trần: đặt `max-h-*` trong `viewportClassName`.
 * `ref` và các prop còn lại (`id`, `onScroll`...) gắn vào vùng cuộn, nên code cũ
 * dùng `scrollRef.current.scrollTo`, `offsetTop`, virtualizer vẫn chạy như trước.
 */

interface OverlayScrollProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className' | 'children'
> {
  /** Class khung ngoài: kích thước, vị trí trong layout cha. */
  className?: string;
  /** Class vùng cuộn: padding, `max-h-*`, bố cục nội dung. */
  viewportClassName?: string;
  children: ReactNode;
}

/** Tay cuộn không ngắn hơn mức này, nội dung rất dài vẫn bấm được. */
const MIN_THUMB = 24;
/** Thôi cuộn bao lâu thì tay cuộn mờ đi. */
const HIDE_DELAY = 800;

export const OverlayScroll = forwardRef<HTMLDivElement, OverlayScrollProps>(function OverlayScroll(
  { className = '', viewportClassName = '', onScroll, children, ...viewportProps },
  ref,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const drag = useRef<{ startY: number; startScroll: number } | null>(null);

  useImperativeHandle(ref, () => viewportRef.current as HTMLDivElement, []);

  // Ghi thẳng lên DOM: scroll bắn liên tục, đi qua state thì render lại mỗi nhịp.
  const update = useCallback(() => {
    const vp = viewportRef.current;
    const thumb = thumbRef.current;
    if (!vp || !thumb) return;
    const { scrollTop, scrollHeight, clientHeight } = vp;
    if (scrollHeight <= clientHeight + 1) {
      thumb.style.display = 'none';
      return;
    }
    const h = Math.max(MIN_THUMB, (clientHeight / scrollHeight) * clientHeight);
    const top = ((clientHeight - h) * scrollTop) / (scrollHeight - clientHeight);
    thumb.style.display = '';
    thumb.style.height = `${h}px`;
    thumb.style.transform = `translateY(${top}px)`;
  }, []);

  // Hiện tay cuộn, hẹn giờ ẩn. Đang kéo thì không ẩn (thả tay mới hẹn lại).
  const reveal = useCallback(() => {
    const thumb = thumbRef.current;
    if (!thumb) return;
    thumb.dataset.active = 'true';
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!drag.current) delete thumb.dataset.active;
    }, HIDE_DELAY);
  }, []);

  // Đo lại khi khung đổi cỡ hoặc nội dung đổi cao (lọc danh sách, virtualizer, ảnh tải xong).
  // Theo dõi từng con trực tiếp; con thêm / bớt thì gắn lại.
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const ro = new ResizeObserver(() => update());
    const observeAll = () => {
      ro.disconnect();
      ro.observe(vp);
      for (const child of Array.from(vp.children)) ro.observe(child);
      update();
    };
    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(vp, { childList: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.clearTimeout(hideTimer.current);
    };
  }, [update]);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    update();
    reveal();
    onScroll?.(e);
  };

  const onThumbPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const vp = viewportRef.current;
    if (!vp) return;
    // Không bôi chữ, không để canvas / popup bên dưới nhận lượt bấm.
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startScroll: vp.scrollTop };
    reveal();
  };

  const onThumbPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const vp = viewportRef.current;
    const thumb = thumbRef.current;
    if (!d || !vp || !thumb) return;
    // Đo bằng rect (px màn hình) cho cùng đơn vị với clientY, đúng cả khi khung
    // bị zoom / scale (Kích thước giao diện, popup toolbar).
    const movable = vp.getBoundingClientRect().height - thumb.getBoundingClientRect().height;
    if (movable <= 0) return;
    const ratio = (e.clientY - d.startY) / movable;
    vp.scrollTop = d.startScroll + ratio * (vp.scrollHeight - vp.clientHeight);
  };

  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    reveal();
  };

  return (
    <div className={`group/ov relative flex flex-col ${className}`}>
      <div
        {...viewportProps}
        ref={viewportRef}
        onScroll={handleScroll}
        className={`no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden ${viewportClassName}`}
      >
        {children}
      </div>
      {/* Vùng bấm rộng 12px, vạch thấy được 6px nằm sát mép phải. */}
      <div
        ref={thumbRef}
        aria-hidden="true"
        onPointerDown={onThumbPointerDown}
        onPointerMove={onThumbPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        style={{ display: 'none' }}
        className="group/thumb absolute right-0 top-0 flex w-3 select-none justify-end pr-0.5 opacity-0 transition-opacity duration-normal ease-standard group-hover/ov:opacity-100 data-[active=true]:opacity-100 motion-reduce:transition-none"
      >
        <span className="h-full w-1.5 rounded-full bg-scrollbar-thumb transition-colors duration-normal ease-standard group-hover/thumb:bg-scrollbar-thumb-hover" />
      </div>
    </div>
  );
});
