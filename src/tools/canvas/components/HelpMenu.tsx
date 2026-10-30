import { CircleHelp, GraduationCap, Keyboard, type LucideIcon } from 'lucide-react';
import { SoonBadge } from '@/components/settings/SettingsBlocks';
import { useShortcutsModalStore } from '@/stores/shortcuts-modal-store';
import { useI18n } from '@/lib/i18n';
import { usePopup } from '../hooks/usePopup';
import { FOCUS_RING } from '@/lib/focus-ring';
import { PRESSABLE_MOTION, ROW_MOTION } from '@/lib/motion';
import { Tooltip } from '@/components/shared';

/**
 * HelpMenu — nút Trợ giúp trên header + popup (Milanote help popup).
 * Mỗi mục: icon trái + tiêu đề + 1 dòng mô tả.
 *   - Phím tắt: mở modal phím tắt (cũng mở được bằng phím `/`).
 *   - Hướng dẫn: chưa có, hiện "Sắp có".
 * Milanote còn có "Help center", "Message support", "What's new" — bibo chưa có nên chưa đưa vào.
 */
export function HelpMenu() {
  // Bấm ngoài / Esc đóng (Esc không lọt xuống canvas) — xem usePopup.
  const { open, ref, close, toggle, presence } = usePopup();
  const openShortcuts = useShortcutsModalStore((s) => s.openModal);
  const { t } = useI18n();
  const label = t('CANVAS.HEADER.HELP');

  return (
    <div ref={ref} className="relative">
      <Tooltip label={label} side="bottom" disabled={open}>
        <button
          type="button"
          onClick={toggle}
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={`grid h-8 w-8 place-items-center rounded-md hover:bg-muted hover:text-foreground ${PRESSABLE_MOTION} ${FOCUS_RING} ${
            open ? 'bg-muted text-foreground' : 'text-muted-foreground'
          }`}
        >
          <CircleHelp className="h-6 w-6" strokeWidth={1.5} />
        </button>
      </Tooltip>

      {presence.mounted ? (
        <div
          role="dialog"
          aria-label={label}
          data-motion="dropdown"
          {...presence.props}
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
              close();
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
      className={`relative flex w-full items-start gap-3 rounded-md p-3 text-left ${ROW_MOTION} ${FOCUS_RING} ${
        soon ? '' : 'hover:bg-muted'
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
