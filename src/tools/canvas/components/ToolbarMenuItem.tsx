import type { LucideIcon } from 'lucide-react';

/**
 * Mục menu trong popup toolbar (More của note / board, More lúc sửa note).
 *
 * `onMouseDown` preventDefault giống ActionButton: bấm mục không lấy focus khỏi
 * editor đang sửa → giữ vùng chọn chữ (More lúc sửa). Không có editor thì vô hại.
 * Mục chưa làm được: `disabled` → aria-disabled (con trỏ not-allowed tự áp), mờ,
 * tooltip qua `title` báo lý do.
 */
export function ToolbarMenuItem({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
  title,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  /** Định dạng đang áp (VD gạch chân trong đoạn đã gạch chân). */
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
      title={title}
      className={`flex h-8 items-center gap-2 rounded-md px-2 text-left text-xs transition-colors duration-fast ${
        disabled
          ? 'text-muted-foreground opacity-40'
          : `hover:bg-muted hover:text-foreground ${active ? 'bg-muted text-foreground' : 'text-muted-foreground'}`
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

/** Vạch ngăn nhóm mục trong menu popup. */
export function ToolbarMenuDivider() {
  return <div className="my-1 border-t border-border" />;
}
