import {
  useCanvasSettingsStore,
  useHeaderStyle,
  type HeaderStyle,
  type ScrollSpeed,
  type SelectionColor,
} from '@/stores/canvas-settings-store';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { getShortcutDef, shortcutKeys, useKeyboardPlatform } from '@/lib/shortcuts';
import { Row, Section, Segmented, Switch } from '../SettingsBlocks';

/** Cài đặt → Canvas: lưới nền, tốc độ cuộn, màu viền chọn, kiểu header. Hút cạnh khi thả luôn bật, không có ở đây. */

// Hằng số ngoài component → lưu key, dịch lúc render.
const SPEED_OPTIONS: { value: ScrollSpeed; labelKey: MessageKey }[] = [
  { value: 'slow', labelKey: 'SETTINGS.CANVAS.SCROLL_SPEED.SLOW' },
  { value: 'normal', labelKey: 'SETTINGS.CANVAS.SCROLL_SPEED.NORMAL' },
  { value: 'fast', labelKey: 'SETTINGS.CANVAS.SCROLL_SPEED.FAST' },
];

const SELECTION_OPTIONS: { value: SelectionColor; labelKey: MessageKey }[] = [
  { value: 'contrast', labelKey: 'SETTINGS.CANVAS.SELECTION_COLOR.CONTRAST' },
  { value: 'primary', labelKey: 'SETTINGS.CANVAS.SELECTION_COLOR.PRIMARY' },
  { value: 'success', labelKey: 'SETTINGS.CANVAS.SELECTION_COLOR.SUCCESS' },
  { value: 'warning', labelKey: 'SETTINGS.CANVAS.SELECTION_COLOR.WARNING' },
];

const HEADER_STYLE_OPTIONS: { value: HeaderStyle; labelKey: MessageKey }[] = [
  { value: 'bar', labelKey: 'SETTINGS.CANVAS.HEADER_STYLE.BAR' },
  { value: 'islands', labelKey: 'SETTINGS.CANVAS.HEADER_STYLE.ISLANDS' },
];

export function CanvasSection({ title, description }: { title: string; description: string }) {
  const { t } = useI18n();
  const platform = useKeyboardPlatform();
  const showGrid = useCanvasSettingsStore((s) => s.showGrid);
  const setShowGrid = useCanvasSettingsStore((s) => s.setShowGrid);
  const scrollSpeed = useCanvasSettingsStore((s) => s.scrollSpeed);
  const setScrollSpeed = useCanvasSettingsStore((s) => s.setScrollSpeed);
  const selectionColor = useCanvasSettingsStore((s) => s.selectionColor);
  const setSelectionColor = useCanvasSettingsStore((s) => s.setSelectionColor);
  const headerStyle = useHeaderStyle();
  const setHeaderStyle = useCanvasSettingsStore((s) => s.setHeaderStyle);
  const reset = useCanvasSettingsStore((s) => s.reset);
  const headerStyleOptions = HEADER_STYLE_OPTIONS.map((opt) => ({
    value: opt.value,
    label: t(opt.labelKey),
  }));

  const selectionOptions = SELECTION_OPTIONS.map((opt) => ({
    value: opt.value,
    label: t(opt.labelKey),
  }));
  const speedOptions = SPEED_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }));
  const zoomWheel = getShortcutDef('canvas.zoom-wheel');

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
          keys: zoomWheel ? shortcutKeys(zoomWheel, platform) : '',
        })}
      >
        <Segmented
          value={scrollSpeed}
          options={speedOptions}
          onChange={setScrollSpeed}
          labelledBy="setting-scroll-speed"
        />
      </Row>
      <Row
        id="setting-selection-color"
        title={t('SETTINGS.CANVAS.SELECTION_COLOR.TITLE')}
        description={t('SETTINGS.CANVAS.SELECTION_COLOR.DESCRIPTION')}
      >
        <Segmented
          value={selectionColor}
          options={selectionOptions}
          onChange={setSelectionColor}
          labelledBy="setting-selection-color"
        />
      </Row>
      <Row
        id="setting-header-style"
        title={t('SETTINGS.CANVAS.HEADER_STYLE.TITLE')}
        description={t('SETTINGS.CANVAS.HEADER_STYLE.DESCRIPTION')}
      >
        <Segmented
          value={headerStyle}
          options={headerStyleOptions}
          onChange={setHeaderStyle}
          labelledBy="setting-header-style"
        />
      </Row>
    </Section>
  );
}
