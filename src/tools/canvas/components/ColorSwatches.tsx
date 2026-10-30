import { Fragment, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useCustomColorStore } from '../store/custom-color-store';
import { sameColor } from '../lib/note-colors';
import { HOVER_MOTION } from '@/lib/motion';

/**
 * Mảnh dùng chung của popup Màu trên toolbar (note, board): hàng ô
 * màu, ô màu, hàng màu tuỳ chỉnh đã lưu, nút "Màu tuỳ chỉnh…". Bố cục parity
 * Milanote: 5 ô 1 hàng, ngăn hàng bằng vạch.
 */

/** Ô màu 28×24, 5 ô / hàng (mỗi loại 10 màu → tự xuống 2 hàng). Popup hẹp vừa 5 ô. */
// Hover chỉ hiện viền (ring = box-shadow), ô không phóng to.
const SWATCH_CLASS = 'relative h-6 w-7 rounded-[4px] transition-shadow duration-quick ease-standard';
const SWATCH_ACTIVE = 'ring-2 ring-foreground ring-offset-1 ring-offset-card';
const SWATCH_IDLE = 'hover:ring-1 hover:ring-border hover:ring-offset-1 hover:ring-offset-card';

export function SwatchRow({ divided, children }: { divided?: boolean; children: ReactNode }) {
  return (
    <div
      className={`grid grid-cols-[repeat(5,28px)] justify-center gap-1.5 px-3 py-4 ${divided ? 'border-t border-border' : ''}`}
    >
      {children}
    </div>
  );
}

interface SwatchProps {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function Swatch({ label, active, onClick, className = '', style, children }: SwatchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      style={style}
      className={`${SWATCH_CLASS} grid place-items-center ${active ? SWATCH_ACTIVE : SWATCH_IDLE} ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Hàng màu tuỳ chỉnh đã lưu (dùng chung mọi loại object). Luôn render hàng, kể
 * cả khi trống → chừa chỗ, chọn màu đầu tiên không làm popup cao lên.
 */
export function SavedColorRow({
  value,
  onPick,
  renderSwatch,
}: {
  /** Màu đang áp, để đánh dấu ô trùng. */
  value: string | null;
  onPick: (hex: string) => void;
  /** Vẽ ô riêng (note tab Thanh trên vẽ ô kiểu thanh, nền chữ đen vẽ chia chéo). Thiếu → ô màu thường. */
  renderSwatch?: (hex: string, active: boolean) => ReactNode;
}) {
  const colors = useCustomColorStore((s) => s.colors);
  return (
    <SwatchRow divided>
      {/* Ô trống giữ chiều cao hàng khi chưa lưu màu nào. */}
      {colors.length === 0 ? <span aria-hidden="true" className="h-6 w-7" /> : null}
      {colors.map((hex) => {
        const active = sameColor(value, hex);
        return renderSwatch ? (
          <Fragment key={hex}>{renderSwatch(hex, active)}</Fragment>
        ) : (
          <Swatch key={hex} label={hex} active={active} onClick={() => onPick(hex)} style={{ backgroundColor: hex }} />
        );
      })}
    </SwatchRow>
  );
}

/**
 * Custom color: ô chọn màu gốc trình duyệt (như Milanote). `input` (kéo trong bảng
 * màu, bắn liên tục) chỉ nhớ màu, không ghi; ghi 1 lần khi bảng màu đóng (OK, Enter
 * hoặc bấm ra ngoài) → 1 bước undo. React `onChange` của input = sự kiện `input` nên
 * phải gắn listener gốc. Màu chốt được lưu vào bảng màu tuỳ chỉnh dùng chung.
 */
export function CustomColorButton({
  label,
  value,
  onPick,
  onPreview,
}: {
  label: string;
  value: string;
  onPick: (hex: string) => void;
  /** Kéo trong bảng màu: đổi màu ngay trên object, không lưu, không undo. */
  onPreview?: (hex: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const onPreviewRef = useRef(onPreview);
  onPreviewRef.current = onPreview;
  const pushCustom = useCustomColorStore((s) => s.push);
  const pushRef = useRef(pushCustom);
  pushRef.current = pushCustom;

  // Màu đang kéo trong bảng màu, chưa áp. Áp khi bảng màu đóng theo bất kỳ cách
  // nào: `change` (bấm OK / Enter), `blur` (bấm ra ngoài), hoặc popup bị gỡ do cú
  // bấm ra ngoài đó đóng luôn popup trước khi `change` kịp bắn (bạn chốt 2026-10-16:
  // bấm ra ngoài cũng là áp). Mỗi màu chỉ áp 1 lần → 1 bước undo.
  const pendingRef = useRef<string | null>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const commit = () => {
      const hex = pendingRef.current;
      if (hex === null) return;
      pendingRef.current = null;
      pushRef.current(hex);
      onPickRef.current(hex);
    };
    const onInput = () => {
      pendingRef.current = el.value;
      onPreviewRef.current?.(el.value);
    };
    const onChange = () => {
      pendingRef.current = el.value;
      commit();
    };
    el.addEventListener('input', onInput);
    el.addEventListener('change', onChange);
    el.addEventListener('blur', commit);
    return () => {
      el.removeEventListener('input', onInput);
      el.removeEventListener('change', onChange);
      el.removeEventListener('blur', commit);
      // Popup đóng giữa chừng (bấm ra ngoài) → vẫn áp màu đang chọn.
      commit();
    };
  }, []);

  // Ô chọn màu chỉ nhận #rrggbb; giá trị lạ (trong suốt) → trắng.
  const safeValue = /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff';
  // Đổi tab / object đổi màu → bảng màu trình duyệt mở ra ở màu hiện tại.
  useEffect(() => {
    if (inputRef.current) inputRef.current.value = safeValue;
  }, [safeValue]);

  return (
    <div className="relative border-t border-border p-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`flex h-10 w-full items-center gap-3 whitespace-nowrap rounded-md border border-border px-3 text-left text-sm text-foreground hover:bg-muted ${HOVER_MOTION}`}
      >
        {/* Vòng màu: hiển thị trang trí, màu cố định (không phải theme). */}
        <span
          aria-hidden="true"
          className="h-5 w-5 rounded-full"
          style={{
            background:
              'radial-gradient(circle, var(--card) 35%, transparent 36%), conic-gradient(#ff5757, #ffd14d, #7cd651, #62dbc8, #4ebafd, #ad6fff, #ff6ed4, #ff5757)',
          }}
        />
        {label}
      </button>
      <input
        ref={inputRef}
        type="color"
        defaultValue={safeValue}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />
    </div>
  );
}
