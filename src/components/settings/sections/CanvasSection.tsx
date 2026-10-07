import { useCanvasSettingsStore, type ScrollSpeed } from '@/stores/canvas-settings-store';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { shortcutKeys, useKeyboardPlatform } from '@/lib/shortcuts';
import { CANVAS_SHORTCUT_DEFS } from '@/tools/canvas/shortcuts';
import { Row, Section, Segmented, Switch } from '../SettingsBlocks';

/** Cài đặt → Canvas: lưới nền, tốc độ cuộn. Hút cạnh khi thả luôn bật, không có ở đây. */

// Hằng số ngoài component → lưu key, dịch lúc render.
const SPEED_OPTIONS: { value: ScrollSpeed; labelKey: MessageKey }[] = [
  { value: 'slow', labelKey: 'SETTINGS.CANVAS.SCROLL_SPEED.SLOW' },
  { value: 'normal', labelKey: 'SETTINGS.CANVAS.SCROLL_SPEED.NORMAL' },
  { value: 'fast', labelKey: 'SETTINGS.CANVAS.SCROLL_SPEED.FAST' },
];

export function CanvasSection({ title, description }: { title: string; description: string }) {
  const { t } = useI18n();
  const platform = useKeyboardPlatform();
  const showGrid = useCanvasSettingsStore((s) => s.showGrid);
  const setShowGrid = useCanvasSettingsStore((s) => s.setShowGrid);
  const scrollSpeed = useCanvasSettingsStore((s) => s.scrollSpeed);
  const setScrollSpeed = useCanvasSettingsStore((s) => s.setScrollSpeed);
  const reset = useCanvasSettingsStore((s) => s.reset);

  const speedOptions = SPEED_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }));

  return (
    <Section title={title} description={description} onReset={reset}>
      <Row
        id="setting-grid"
        title={t('SETTINGS.CANVAS.GRID.TITLE')}
        description={t('SETTINGS.CANVAS.GRID.DESCRIPTION')}
      >
        <Switch checked={showGrid} onChange={setShowGrid} labelledBy="setting-grid" />
      </Row>
      <Row
        id="setting-scroll-speed"
        title={t('SETTINGS.CANVAS.SCROLL_SPEED.TITLE')}
        description={t('SETTINGS.CANVAS.SCROLL_SPEED.DESCRIPTION', {
          keys: shortcutKeys(CANVAS_SHORTCUT_DEFS['canvas.zoom-wheel'], platform),
        })}
      >
        <Segmented
          value={scrollSpeed}
          options={speedOptions}
          onChange={setScrollSpeed}
          labelledBy="setting-scroll-speed"
        />
      </Row>
    </Section>
  );
}
