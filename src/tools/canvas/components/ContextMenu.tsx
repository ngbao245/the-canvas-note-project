import { useEffect, useRef } from 'react';
import { Square } from 'lucide-react';
import { useEscapeLayer } from '@/lib/shortcuts';
import { ROW_MOTION, usePresence } from '@/lib/motion';

/**
 * Context menu tuỳ biến (custom, không cần Radix DropdownMenu vì chỉ 1 item ở Phase A).
 * Cha giữ toạ độ + `open`; đóng thì menu tan tại chỗ (motion `context-menu`) rồi gỡ.
 * Đóng khi click ngoài hoặc Escape (cả 2 gỡ ngay khi bắt đầu đóng).
 * Vị trí render theo toạ độ screen của right-click.
 */

interface Item {
  icon?: typeof Square;
  label: string;
  onClick: () => void;
}

interface ContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  items: Item[];
  onClose: () => void;
}

export function ContextMenu({ open, x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const presence = usePresence(open);

  useEffect(() => {
    if (!open) return;
    // pointerdown + capture: canvas preventDefault pointerdown nên không có mousedown.
    const onDocDown = (e: PointerEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    // Delay tránh menu tự đóng ngay ở event mở.
    const t = setTimeout(() => {
      window.addEventListener('pointerdown', onDocDown, true);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', onDocDown, true);
    };
  }, [open, onClose]);

  // Lớp overlay: Esc chỉ đóng menu, không lọt xuống canvas bỏ chọn.
  useEscapeLayer(onClose, { enabled: open });

  if (!presence.mounted) return null;

  return (
    <div
      ref={ref}
      role="menu"
      data-motion="context-menu"
      {...presence.props}
      className="fixed z-modal min-w-40 rounded-md border border-border bg-popover p-1 text-sm shadow-lg"
      style={{ left: x, top: y }}
    >
      {items.map((it, i) => (
        <button
          key={i}
          type="button"
          role="menuitem"
          onClick={() => {
            it.onClick();
            onClose();
          }}
          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-popover-foreground hover:bg-muted ${ROW_MOTION}`}
        >
          {it.icon ? <it.icon className="h-4 w-4 text-muted-foreground" /> : null}
          {it.label}
        </button>
      ))}
    </div>
  );
}
