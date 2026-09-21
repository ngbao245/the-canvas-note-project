import { useEffect, useRef } from 'react';
import { Square } from 'lucide-react';

/**
 * Context menu tuỳ biến (custom, không cần Radix DropdownMenu vì chỉ 1 item ở Phase A).
 * Bật/tắt qua state `menu`, đóng khi click ngoài hoặc Escape.
 * Vị trí render theo toạ độ screen của right-click.
 */

interface Item {
  icon?: typeof Square;
  label: string;
  onClick: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: Item[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Delay tránh menu tự đóng ngay ở event mở.
    const t = setTimeout(() => {
      document.addEventListener('mousedown', onDocDown);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-modal min-w-40 rounded-md border border-border bg-popover p-1 text-sm shadow-lg"
      style={{ left: x, top: y }}
    >
      {items.map((it, i) => (
        <button
          key={i}
          type="button"
          onClick={() => {
            it.onClick();
            onClose();
          }}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-popover-foreground hover:bg-muted"
        >
          {it.icon ? <it.icon className="h-4 w-4 text-muted-foreground" /> : null}
          {it.label}
        </button>
      ))}
    </div>
  );
}
