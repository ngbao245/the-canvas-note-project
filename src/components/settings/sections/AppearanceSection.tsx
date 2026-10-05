import { DEFAULT_THEME, useThemeStore, type Theme, type ThemePreference } from '@/stores/theme-store';
import { DEFAULT_UI_STYLE, useUiStyleStore, type UiStyle } from '@/stores/ui-style-store';
import { Field, OptionCard, Row, Section, SoonBadge } from '../SettingsBlocks';
import { useI18n, type MessageKey } from '@/lib/i18n';

/** Cài đặt → Giao diện: theme, phong cách, font (chờ chọn). */

const THEME_OPTIONS: { value: ThemePreference; labelKey: MessageKey }[] = [
  { value: 'dark', labelKey: 'SETTINGS.APPEARANCE.MODE.DARK' },
  { value: 'light', labelKey: 'SETTINGS.APPEARANCE.MODE.LIGHT' },
  { value: 'system', labelKey: 'SETTINGS.APPEARANCE.MODE.SYSTEM' },
];

// Hằng số ngoài component → lưu key, dịch lúc render bằng t().
const STYLE_OPTIONS: { value: UiStyle; labelKey: MessageKey; hintKey: MessageKey }[] = [
  {
    value: 'hand',
    labelKey: 'SETTINGS.APPEARANCE.STYLE.HAND',
    hintKey: 'SETTINGS.APPEARANCE.STYLE.HAND_HINT',
  },
  {
    value: 'flat',
    labelKey: 'SETTINGS.APPEARANCE.STYLE.FLAT',
    hintKey: 'SETTINGS.APPEARANCE.STYLE.FLAT_HINT',
  },
];

export function AppearanceSection({ title, description }: { title: string; description: string }) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const style = useUiStyleStore((s) => s.style);
  const setStyle = useUiStyleStore((s) => s.setStyle);
  const { t } = useI18n();

  const reset = () => {
    setTheme(DEFAULT_THEME);
    setStyle(DEFAULT_UI_STYLE);
  };

  return (
    <Section title={title} description={description} onReset={reset}>
      <Field label={t('SETTINGS.APPEARANCE.THEME')}>
        <div
          role="radiogroup"
          aria-label={t('SETTINGS.APPEARANCE.THEME')}
          className="grid grid-cols-3 gap-3 sm:max-w-lg"
        >
          {THEME_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              selected={theme === opt.value}
              onSelect={() => setTheme(opt.value)}
              label={t(opt.labelKey)}
            >
              <ThemePreview pref={opt.value} />
            </OptionCard>
          ))}
        </div>
      </Field>

      <Field label={t('SETTINGS.APPEARANCE.STYLE.TITLE')}>
        <div
          role="radiogroup"
          aria-label={t('SETTINGS.APPEARANCE.STYLE.TITLE')}
          className="grid grid-cols-2 gap-3 sm:max-w-md"
        >
          {STYLE_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              selected={style === opt.value}
              onSelect={() => setStyle(opt.value)}
              label={t(opt.labelKey)}
              hint={t(opt.hintKey)}
            />
          ))}
        </div>
      </Field>

      <Row
        title={t('SETTINGS.APPEARANCE.FONT.TITLE')}
        description={t('SETTINGS.APPEARANCE.FONT.DESCRIPTION')}
      >
        <SoonBadge />
      </Row>
    </Section>
  );
}

/**
 * Xem trước theme bằng chính token thật: bọc data-theme cục bộ → biến CSS trong
 * khối đổi theo, không hard-code màu. 'Theo hệ thống' = nửa tối | nửa sáng.
 */
function ThemePreview({ pref }: { pref: ThemePreference }) {
  if (pref === 'system') {
    return (
      <div aria-hidden="true" className="mb-2 flex h-14 overflow-hidden rounded-md border border-border">
        <MiniWindow theme="dark" className="rounded-none border-0" />
        <MiniWindow theme="light" className="rounded-none border-0" />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="mb-2 flex h-14">
      <MiniWindow theme={pref} className="rounded-md border border-border" />
    </div>
  );
}

function MiniWindow({ theme, className }: { theme: Theme; className: string }) {
  return (
    <div data-theme={theme} className={`flex flex-1 gap-1.5 bg-background p-2 ${className}`}>
      <div className="w-1/4 rounded-sm bg-card" />
      <div className="flex flex-1 flex-col gap-1 rounded-sm bg-card p-1.5">
        <div className="h-1.5 w-3/4 rounded-full bg-foreground" />
        <div className="h-1.5 w-1/2 rounded-full bg-muted-foreground" />
        <div className="mt-auto h-2 w-1/3 rounded-full bg-primary" />
      </div>
    </div>
  );
}
