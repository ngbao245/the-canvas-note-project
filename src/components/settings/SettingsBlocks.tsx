import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/**
 * Khối dựng dùng chung cho các mục trong modal Cài đặt.
 * Mục mới chỉ ghép các khối này, không tự viết lại hàng / thẻ / công tắc.
 */

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function Section({
  title,
  description,
  children,
  onReset,
}: {
  title: string;
  description: string;
  children: ReactNode;
  /** Có thì hiện nút "Đặt lại mặc định" cuối mục (chỉ đặt lại nhóm này). */
  onReset?: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="min-w-0">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="flex flex-col">{children}</div>
      {onReset ? (
        <div className="mt-6">
          <button
            type="button"
            onClick={onReset}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground ${FOCUS_RING}`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('COMMON.RESET_DEFAULT')}
          </button>
        </div>
      ) : null}
    </section>
  );
}

/** Nhóm có nhãn ở trên, nội dung lớn bên dưới (VD lưới thẻ chọn theme). */
export function Field({
  label,
  children,
  aside,
  headerClassName = '',
}: {
  label: string;
  children: ReactNode;
  /** Phần phụ bên phải nhãn (VD gợi ý phím tắt). */
  aside?: ReactNode;
  /** Giới hạn bề rộng hàng nhãn cho khớp nội dung bên dưới (VD 'sm:max-w-lg' như lưới thẻ),
   *  để `aside` thẳng mép phải nội dung thay vì lòi ra mép cột. */
  headerClassName?: string;
}) {
  return (
    <div className="border-b border-border py-5 first:pt-0">
      <div className={`mb-3 flex items-center justify-between gap-4 ${headerClassName}`}>
        <h3 className="text-sm font-medium">{label}</h3>
        {aside}
      </div>
      {children}
    </div>
  );
}

/** 1 phím trong tổ hợp phím tắt. Tên phím (Ctrl, Shift) giữ nguyên mọi ngôn ngữ. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="min-w-[1.5rem] rounded border border-border bg-muted px-1.5 py-0.5 text-center font-sans text-[11px] text-foreground">
      {children}
    </kbd>
  );
}

/** Hàng: tiêu đề + mô tả bên trái, điều khiển bên phải. */
export function Row({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description: string;
  children: ReactNode;
  /** id cho tiêu đề → điều khiển bên phải tham chiếu bằng aria-labelledby. */
  id?: string;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-border py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <h3 id={id} className="text-sm font-medium">
          {title}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

/** Không truyền children → "Sắp có" theo ngôn ngữ (dịch lúc render, không đặt chữ ở default param). */
export function SoonBadge({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  return (
    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
      {children ?? t('COMMON.COMING_SOON')}
    </span>
  );
}

/** Thẻ chọn trong radiogroup (theme, phong cách). */
export function OptionCard({
  selected,
  onSelect,
  label,
  hint,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border p-3 text-left transition-colors duration-200 ${FOCUS_RING} ${
        selected ? 'border-primary bg-primary-soft' : 'border-border hover:bg-muted'
      }`}
    >
      {children}
      {/* Không đổi độ đậm khi chọn → chữ không rộng ra, thẻ không nhích. */}
      <span className={`block text-sm font-medium ${selected ? 'text-primary' : 'text-foreground'}`}>
        {label}
      </span>
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </button>
  );
}

/** Công tắc bật/tắt. Nhãn lấy từ tiêu đề Row qua labelledBy. */
export function Switch({
  checked,
  onChange,
  labelledBy,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelledBy: string;
  /** Chưa có tính năng: hiện đúng trạng thái nhưng bấm không đổi. aria-disabled
   *  (không phải `disabled`) để vẫn nhận hover → tooltip "Sắp có" của hàng cha. */
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : () => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${FOCUS_RING} ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${checked ? 'bg-primary' : 'bg-muted ring-1 ring-inset ring-border'}`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-background shadow-elevation-1 transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/** Nhóm nút chọn 1 trong vài giá trị ngắn (VD Chậm / Vừa / Nhanh). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  labelledBy,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
  labelledBy: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="flex shrink-0 rounded-md bg-muted p-0.5"
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`cursor-pointer rounded px-3 py-1 text-xs font-medium transition-colors duration-200 ${FOCUS_RING} ${
              selected
                ? 'bg-background text-foreground shadow-elevation-1'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
