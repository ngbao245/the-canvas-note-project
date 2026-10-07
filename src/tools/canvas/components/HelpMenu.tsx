import { useEffect, useRef, useState } from 'react';
import { CircleHelp, GraduationCap, Keyboard, type LucideIcon } from 'lucide-react';
import { SoonBadge } from '@/components/settings/SettingsBlocks';
import { useShortcutsModalStore } from '@/stores/shortcuts-modal-store';
import { useI18n } from '@/lib/i18n';
import { useEscapeLayer } from '@/lib/shortcuts';

/**
 * HelpMenu — nút Trợ giúp trên header + popup (Milanote help popup).
 * Mỗi mục: icon trái + tiêu đề + 1 dòng mô tả.
 *   - Phím tắt: mở modal phím tắt (cũng mở được bằng phím `/`).
 *   - Hướng dẫn: chưa có, hiện "Sắp có".
 * Milanote còn có "Help center", "Message support", "What's new" — bibo chưa có nên chưa đưa vào.
 */
export function HelpMenu() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const openShortcuts = useShortcutsModalStore((s) => s.openModal);
  const { t } = useI18n();
  const label = t('CANVAS.HEADER.HELP');

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Lớp overlay: Esc chỉ đóng popup, không lọt xuống canvas.
  useEscapeLayer(() => setOpen(false), { enabled: open });

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={label}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`grid h-8 w-8 cursor-pointer place-items-center rounded-md transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          open ? 'bg-muted text-foreground' : 'text-muted-foreground'
        }`}
      >
        <CircleHelp className="h-6 w-6" strokeWidth={1.5} />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={label}
          className="absolute right-0 top-full z-tooltip mt-2 w-72 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-elevation-2"
        >
          {/* Mũi tên chỉ lên nút: tâm nút 32px cách mép phải 16px. */}
          <span
            aria-hidden="true"
            className="absolute -top-[6px] right-[10px] h-3 w-3 rotate-45 border-l border-t border-border bg-popover"
          />
          <HelpItem
            icon={Keyboard}
            title={t('CANVAS.HELP_MENU.SHORTCUTS_TITLE')}
            description={t('CANVAS.HELP_MENU.SHORTCUTS_DESCRIPTION')}
            onClick={() => {
              setOpen(false);
              openShortcuts();
            }}
          />
          <HelpItem
            icon={GraduationCap}
            title={t('CANVAS.HELP_MENU.TUTORIAL_TITLE')}
            description={t('CANVAS.HELP_MENU.TUTORIAL_DESCRIPTION')}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * 1 mục trong popup. Không có onClick → chưa có tính năng: aria-disabled (vẫn nhận hover
 * để hiện tooltip) + nhãn "Sắp có".
 */
function HelpItem({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick?: () => void;
}) {
  const { t } = useI18n();
  const soon = !onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={soon || undefined}
      title={soon ? `${title} (${t('COMMON.COMING_SOON')})` : undefined}
      className={`relative flex w-full items-start gap-3 rounded-md p-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        soon ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-muted'
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted ${
          soon ? 'text-muted-foreground' : 'text-primary'
        }`}
      >
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold ${soon ? 'text-muted-foreground' : 'text-foreground'}`}
          >
            {title}
          </span>
          {soon ? <SoonBadge /> : null}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
