import { Fragment, type ReactNode } from 'react';
import {
  Command,
  Mouse,
  MousePointer2,
  MousePointerClick,
  Move,
  type LucideIcon,
} from 'lucide-react';
import { useI18n, type MessageKey } from '@/lib/i18n';
import {
  comboKeyLabels,
  displayWays,
  type DisplayToken,
  type DisplayWay,
  type PointerKind,
  type ShortcutDef,
  useKeyboardPlatform,
} from '@/lib/shortcuts';

/**
 * Hiện cách bấm của 1 phím từ bảng phím chung: phím và thao tác chuột (ô Kbd), chữ nối.
 * Dùng ở modal phím tắt và chỗ gợi ý phím (VD Cài đặt → Giao diện). Không ghi cứng tên phím.
 * Ký hiệu theo Kiểu bàn phím (⌘ trên macOS) do `comboKeyLabels` lo, đổi ngay khi user đổi.
 */

const POINTERS: Record<
  PointerKind,
  { icon: LucideIcon; labelKey: MessageKey; iconOnly?: boolean }
> = {
  // Lăn chuột: chỉ icon (chữ ẩn cho trình đọc màn hình + tooltip).
  wheel: { icon: Mouse, labelKey: 'SHORTCUTS.POINTER.WHEEL', iconOnly: true },
  click: { icon: MousePointer2, labelKey: 'SHORTCUTS.POINTER.CLICK' },
  'double-click': { icon: MousePointerClick, labelKey: 'SHORTCUTS.POINTER.DOUBLE_CLICK' },
  drag: { icon: Move, labelKey: 'SHORTCUTS.POINTER.DRAG' },
  'middle-drag': { icon: Mouse, labelKey: 'SHORTCUTS.POINTER.MIDDLE_DRAG' },
};

/** 1 phím. Tên phím (Ctrl, ⌘, Shift) giữ nguyên mọi ngôn ngữ; `title` là tên đầy đủ. */
export function Kbd({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <kbd
      title={title}
      // min-h cố định: phím icon và phím chữ cao bằng nhau.
      // select-none: phím là nhãn để nhìn, không cho bôi đen (mọi nơi dùng Kbd).
      className="inline-flex min-h-[1.25rem] select-none min-w-[1.5rem] items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-center font-sans text-[11px] text-foreground"
    >
      {children}
    </kbd>
  );
}

/** Mọi cách bấm của 1 phím, nối bằng "hoặc". */
export function ShortcutWays({ def }: { def: ShortcutDef }) {
  return <WayList ways={displayWays(def)} />;
}

/**
 * Dấu ngăn giữa các cách bấm thay thế: hiện "|", trình đọc màn hình vẫn đọc "hoặc".
 * Dùng "|" thay "/" để không nhầm với phím `/` (mở modal phím tắt).
 */
export function OrSeparator() {
  const { t } = useI18n();
  return (
    <>
      <span aria-hidden="true" className="select-none text-xs text-muted-foreground">
        |
      </span>
      <span className="sr-only">{t('COMMON.OR')}</span>
    </>
  );
}

export function WayList({ ways }: { ways: readonly DisplayWay[] }) {
  return (
    <span className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
      {ways.map((way, i) => (
        // Bảng tĩnh, thứ tự không đổi → index làm key được.
        <Fragment key={i}>
          {i > 0 ? <OrSeparator /> : null}
          <span className="flex items-center gap-1">
            {way.map((token, j) => (
              <Token key={j} token={token} />
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

function Token({ token }: { token: DisplayToken }) {
  const { t } = useI18n();
  const platform = useKeyboardPlatform();
  if ('combo' in token) {
    return (
      <>
        {comboKeyLabels(token.combo, platform).map((k) => (
          <Kbd key={k.label} title={k.title}>
            {/* ⌘ vẽ bằng icon để máy nào cũng cùng cỡ; phím 2 OS đều có hiện chữ. */}
            {k.glyph === 'command' ? (
              <>
                <Command aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
                <span className="sr-only">{k.title}</span>
              </>
            ) : (
              k.label
            )}
          </Kbd>
        ))}
      </>
    );
  }
  if ('text' in token) {
    return <span className="select-none text-xs text-muted-foreground">{t(token.text)}</span>;
  }
  // Thao tác chuột cũng nằm trong ô phím như Ctrl / Shift: 1 dòng đọc liền "Ctrl [kéo]".
  const { icon: Icon, labelKey, iconOnly } = POINTERS[token.pointer];
  const label = t(labelKey);
  return (
    <Kbd title={iconOnly ? label : undefined}>
      <span className="inline-flex items-center gap-1">
        <Icon aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
        <span className={iconOnly ? 'sr-only' : undefined}>{label}</span>
      </span>
    </Kbd>
  );
}
