import { ExternalLink, Redo2, RotateCcw, Undo2, type LucideIcon } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { shortcutKeys, useKeyboardPlatform } from '@/lib/shortcuts';
import { FOCUS_RING } from '@/lib/focus-ring';
import { useDemoStore } from './demo-store';
import { DEMO_SHORTCUT_DEFS } from './demo-shortcuts';
import { APP_CANVAS_URL } from '../app-url';

/** Header gọn 1 hàng của canvas mini. */
export function DemoHeader({ onReset }: { onReset: () => void }) {
  const { t, formatNumber } = useI18n();
  const platform = useKeyboardPlatform();
  const canUndo = useDemoStore((s) => s.past.length > 0);
  const canRedo = useDemoStore((s) => s.future.length > 0);
  const zoom = useDemoStore((s) => s.camera.zoom);
  const undo = useDemoStore((s) => s.undo);
  const redo = useDemoStore((s) => s.redo);

  const undoLabel = t('LANDING.DEMO.UNDO');
  const redoLabel = t('LANDING.DEMO.REDO');

  return (
    <div className="flex h-11 shrink-0 select-none items-center gap-1 border-b border-border bg-card px-3 text-sm text-foreground">
      <span className="mr-auto font-serif font-semibold">{t('LANDING.DEMO.BRAND')}</span>
      <IconButton
        icon={Undo2}
        label={undoLabel}
        title={t('COMMON.WITH_SHORTCUT', {
          label: undoLabel,
          keys: shortcutKeys(DEMO_SHORTCUT_DEFS['demo.undo'], platform),
        })}
        disabled={!canUndo}
        onClick={() => undo()}
      />
      <IconButton
        icon={Redo2}
        label={redoLabel}
        title={t('COMMON.WITH_SHORTCUT', {
          label: redoLabel,
          keys: shortcutKeys(DEMO_SHORTCUT_DEFS['demo.redo'], platform),
        })}
        disabled={!canRedo}
        onClick={() => redo()}
      />
      <span className="mx-2 w-12 text-center tabular-nums text-muted-foreground" aria-live="off">
        {formatNumber(Math.round(zoom * 100))}%
      </span>
      <IconButton
        icon={RotateCcw}
        label={t('LANDING.DEMO.RESET')}
        title={t('LANDING.DEMO.RESET')}
        onClick={onReset}
      />
      <a
        href={APP_CANVAS_URL}
        className={`ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-primary transition-colors duration-normal ease-standard hover:bg-muted ${FOCUS_RING}`}
      >
        {t('LANDING.HERO.OPEN_FULL')}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}

function IconButton({
  icon: Icon,
  label,
  title,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-normal ease-standard hover:bg-muted disabled:opacity-40 ${FOCUS_RING}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
