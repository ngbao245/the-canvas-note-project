import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';
import { ESCAPE_COMBO, useShortcutLayer } from '@/lib/shortcuts';
import { useInterfaceScale } from '@/stores/interface-store';

/**
 * Tooltip có độ trễ cho nút icon ở toolbar canvas + header (spec motion-system US-6).
 * Thay `title=` của trình duyệt (~1 giây, không chỉnh được). Nút dùng Tooltip thì
 * KHÔNG đặt `title` nữa (tránh 2 tooltip), giữ `aria-label`.
 *
 *   <Tooltip label={t('CANVAS.HEADER.UNDO_TITLE')} side="bottom">
 *     <button aria-label={...}>...</button>
 *   </Tooltip>
 *
 * - Hiện sau HOVER_DELAY_MS rê chuột yên, hoặc ngay khi focus bằng bàn phím.
 * - "Cửa sổ ấm": vừa ẩn tooltip này mà rê sang nút khác trong WARM_MS → hiện ngay.
 * - Ẩn ngay khi rời nút, nhấn chuột, Esc (Esc vẫn rơi xuống lớp dưới), hoặc `disabled`.
 * - Bỏ qua chạm (touch). Không có hiệu ứng thoát (motion `tooltip` chỉ có vào).
 *
 * Bọc bằng `display: contents` → không đổi layout của nút; vị trí đo theo phần tử con.
 * Nút tắt dùng `aria-disabled` (không `disabled`): nút `disabled` không nhận sự kiện
 * chuột nên tooltip không hiện được.
 */

type Side = 'right' | 'left' | 'bottom' | 'top';

interface TooltipProps {
  label: string;
  /** Phía ưu tiên, tự lật khi sát mép màn hình. */
  side?: Side;
  /** Không hiện (VD nút đang mở popup của chính nó). */
  disabled?: boolean;
  children: ReactElement;
}

/** Độ trễ trước khi hiện, đủ để rê ngang qua dãy nút không bật tooltip. */
const HOVER_DELAY_MS = 500;
/** Sau khi 1 tooltip ẩn, trong khoảng này tooltip kế hiện ngay. */
const WARM_MS = 300;
/** Khe giữa nút và tooltip, px chưa nhân kích thước giao diện. */
const GAP = 6;
const VIEWPORT_MARGIN = 8;
/** Cỡ chữ gốc (text-xs), nhân kích thước giao diện như toolbar / header. */
const FONT_PX = 12;

/** Mốc hết "ấm", dùng chung mọi tooltip (chỉ 1 tooltip hiện tại 1 lúc). */
let warmUntil = 0;

const OPPOSITE: Record<Side, Side> = { right: 'left', left: 'right', bottom: 'top', top: 'bottom' };

export function Tooltip({ label, side = 'bottom', disabled = false, children }: TooltipProps) {
  const [shown, setShown] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const scale = useInterfaceScale();

  const clearTimer = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const show = () => {
    clearTimer();
    if (disabled) return;
    if (Date.now() < warmUntil) {
      setShown(true);
      return;
    }
    timerRef.current = setTimeout(() => setShown(true), HOVER_DELAY_MS);
  };

  const hide = () => {
    clearTimer();
    setShown((was) => {
      if (was) warmUntil = Date.now() + WARM_MS;
      return false;
    });
  };

  // Bị tắt giữa chừng (mở popup) → ẩn luôn, huỷ hẹn giờ đang chờ.
  useEffect(() => {
    if (!disabled) return;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    setShown(false);
  }, [disabled]);

  useEffect(() => {
    const timers = timerRef;
    return () => {
      if (timers.current !== null) clearTimeout(timers.current);
    };
  }, []);

  // Esc ẩn tooltip nhưng trả false → popup / canvas bên dưới vẫn nhận Esc.
  useShortcutLayer(
    'overlay',
    [
      {
        id: 'tooltip.escape',
        combos: [ESCAPE_COMBO],
        run: () => {
          hide();
          return false;
        },
      },
    ],
    { enabled: shown },
  );

  // Gắn mô tả cho trình đọc màn hình chỉ khi tooltip đang hiện.
  useEffect(() => {
    const el = wrapRef.current?.firstElementChild;
    if (!shown || !el) return;
    el.setAttribute('aria-describedby', id);
    return () => el.removeAttribute('aria-describedby');
  }, [shown, id]);

  // Đo + đặt vị trí trước paint (tooltip render ẩn ở 0,0 tới khi đặt xong).
  useLayoutEffect(() => {
    const el = wrapRef.current?.firstElementChild;
    const tip = tipRef.current;
    if (!shown || !el || !tip) return;
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const gap = GAP * scale;

    const fits = (s: Side) =>
      s === 'right'
        ? r.right + gap + w <= vw - VIEWPORT_MARGIN
        : s === 'left'
          ? r.left - gap - w >= VIEWPORT_MARGIN
          : s === 'bottom'
            ? r.bottom + gap + h <= vh - VIEWPORT_MARGIN
            : r.top - gap - h >= VIEWPORT_MARGIN;
    const placed = fits(side) || !fits(OPPOSITE[side]) ? side : OPPOSITE[side];

    let left: number;
    let top: number;
    if (placed === 'right' || placed === 'left') {
      left = placed === 'right' ? r.right + gap : r.left - gap - w;
      top = r.top + r.height / 2 - h / 2;
    } else {
      left = r.left + r.width / 2 - w / 2;
      top = placed === 'bottom' ? r.bottom + gap : r.top - gap - h;
    }
    left = clamp(left, VIEWPORT_MARGIN, vw - VIEWPORT_MARGIN - w);
    top = clamp(top, VIEWPORT_MARGIN, vh - VIEWPORT_MARGIN - h);

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.dataset.side = placed;
    tip.style.visibility = 'visible';
  }, [shown, side, scale, label]);

  const onPointerEnter = (e: ReactPointerEvent) => {
    if (e.pointerType === 'touch') return;
    show();
  };

  return (
    <span
      ref={wrapRef}
      className="contents"
      onPointerEnter={onPointerEnter}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={(e) => {
        // Chỉ focus bàn phím (không phải focus do bấm chuột).
        if (e.target instanceof Element && e.target.matches(':focus-visible')) {
          clearTimer();
          if (!disabled) setShown(true);
        }
      }}
      onBlur={hide}
    >
      {children}
      {shown
        ? createPortal(
            <div
              ref={tipRef}
              id={id}
              role="tooltip"
              data-motion="tooltip"
              data-state="open"
              style={{ position: 'fixed', left: 0, top: 0, visibility: 'hidden', fontSize: FONT_PX * scale }}
              className="pointer-events-none z-tooltip max-w-[20em] whitespace-nowrap rounded-md bg-foreground px-[0.65em] py-[0.35em] font-medium leading-tight text-background shadow-elevation-2"
            >
              {label}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), Math.max(min, max));
}
