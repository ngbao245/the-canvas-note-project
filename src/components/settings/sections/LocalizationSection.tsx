import { LOCALES, useI18n, useLocaleStore, type Locale, type MessageKey } from '@/lib/i18n';
import { detectKeyboardPlatform } from '@/lib/shortcuts';
import {
  KEYBOARD_PLATFORM_PREFS,
  useKeyboardPlatformStore,
  type KeyboardPlatform,
  type KeyboardPlatformPref,
} from '@/stores/keyboard-platform-store';
import { Row, Section, Segmented, SoonBadge } from '../SettingsBlocks';

/**
 * Cài đặt → Ngôn ngữ và vùng.
 * - Ngôn ngữ: chọn được (spec `i18n`). Chọn rồi thì ghi `bibo-locale`, từ đó không theo trình duyệt nữa.
 * - Kiểu bàn phím: Tự động / macOS / Windows-Linux (spec `shortcuts` US-9). Tự động hiện kèm
 *   kết quả detect để user biết app đang nhận máy gì.
 * - Định dạng ngày, ngày đầu tuần: app chưa hiện ngày giờ nào → chưa có chỗ áp dụng, giữ "Chưa đổi được".
 */

const LANGUAGE_TITLE_ID = 'settings-language-title';
const KEYBOARD_TITLE_ID = 'settings-keyboard-title';

// Key tên ngôn ngữ in hoa, giá trị locale chữ thường ('vi') → tra bảng, không ghép chuỗi.
// Thêm ngôn ngữ mới thì TS báo thiếu dòng ở đây.
const LOCALE_LABEL_KEY: Record<Locale, MessageKey> = {
  vi: 'LOCALE.VI',
  en: 'LOCALE.EN',
};

const PLATFORM_LABEL_KEY: Record<KeyboardPlatform, MessageKey> = {
  macos: 'SETTINGS.LOCALIZATION.KEYBOARD.MACOS',
  'windows-linux': 'SETTINGS.LOCALIZATION.KEYBOARD.WINDOWS_LINUX',
};

export function LocalizationSection({ title, description }: { title: string; description: string }) {
  const { t, locale } = useI18n();
  const setLocale = useLocaleStore((s) => s.setLocale);
  const keyboardPref = useKeyboardPlatformStore((s) => s.pref);
  const setKeyboardPref = useKeyboardPlatformStore((s) => s.setPref);

  // Tên ngôn ngữ luôn viết bằng chính tiếng đó ("English" ở cả 2 bộ chữ) để ai cũng nhận ra.
  const languageOptions: { value: Locale; label: string }[] = LOCALES.map((value) => ({
    value,
    label: t(LOCALE_LABEL_KEY[value]),
  }));

  const keyboardOptions: { value: KeyboardPlatformPref; label: string }[] =
    KEYBOARD_PLATFORM_PREFS.map((value) => ({
      value,
      label:
        value === 'auto'
          ? t('SETTINGS.LOCALIZATION.KEYBOARD.AUTO', {
              detected: t(PLATFORM_LABEL_KEY[detectKeyboardPlatform()]),
            })
          : t(PLATFORM_LABEL_KEY[value]),
    }));

  const pending = [
    {
      key: 'dateFormat',
      title: t('SETTINGS.LOCALIZATION.DATE_FORMAT.TITLE'),
      description: t('SETTINGS.LOCALIZATION.DATE_FORMAT.DESCRIPTION'),
      current: 'dd/mm/yyyy',
    },
    {
      key: 'weekStart',
      title: t('SETTINGS.LOCALIZATION.WEEK_START.TITLE'),
      description: t('SETTINGS.LOCALIZATION.WEEK_START.DESCRIPTION'),
      current: t('SETTINGS.LOCALIZATION.WEEK_START.MONDAY'),
    },
  ];

  return (
    <Section title={title} description={description}>
      <Row
        id={LANGUAGE_TITLE_ID}
        title={t('SETTINGS.LOCALIZATION.LANGUAGE.TITLE')}
        description={t('SETTINGS.LOCALIZATION.LANGUAGE.DESCRIPTION')}
      >
        <Segmented
          value={locale}
          options={languageOptions}
          onChange={setLocale}
          labelledBy={LANGUAGE_TITLE_ID}
        />
      </Row>
      <Row
        id={KEYBOARD_TITLE_ID}
        title={t('SETTINGS.LOCALIZATION.KEYBOARD.TITLE')}
        description={t('SETTINGS.LOCALIZATION.KEYBOARD.DESCRIPTION')}
      >
        <Segmented
          value={keyboardPref}
          options={keyboardOptions}
          onChange={setKeyboardPref}
          labelledBy={KEYBOARD_TITLE_ID}
        />
      </Row>
      {pending.map((item) => (
        <Row key={item.key} title={item.title} description={item.description}>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm text-foreground">{item.current}</span>
            <SoonBadge>{t('SETTINGS.LOCALIZATION.NOT_AVAILABLE')}</SoonBadge>
          </div>
        </Row>
      ))}
    </Section>
  );
}
