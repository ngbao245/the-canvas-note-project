import { LOCALES, useI18n, useLocaleStore, type Locale, type MessageKey } from '@/lib/i18n';
import { Row, Section, Segmented, SoonBadge } from '../SettingsBlocks';

/**
 * Cài đặt → Ngôn ngữ và vùng.
 * - Ngôn ngữ: chọn được (spec `i18n`). Chọn rồi thì ghi `bibo-locale`, từ đó không theo trình duyệt nữa.
 * - Định dạng ngày, ngày đầu tuần: app chưa hiện ngày giờ nào → chưa có chỗ áp dụng, giữ "Chưa đổi được".
 */

const LANGUAGE_TITLE_ID = 'settings-language-title';

// Key tên ngôn ngữ in hoa, giá trị locale chữ thường ('vi') → tra bảng, không ghép chuỗi.
// Thêm ngôn ngữ mới thì TS báo thiếu dòng ở đây.
const LOCALE_LABEL_KEY: Record<Locale, MessageKey> = {
  vi: 'LOCALE.VI',
  en: 'LOCALE.EN',
};

export function LocalizationSection({ title, description }: { title: string; description: string }) {
  const { t, locale } = useI18n();
  const setLocale = useLocaleStore((s) => s.setLocale);

  // Tên ngôn ngữ luôn viết bằng chính tiếng đó ("English" ở cả 2 bộ chữ) để ai cũng nhận ra.
  const languageOptions: { value: Locale; label: string }[] = LOCALES.map((value) => ({
    value,
    label: t(LOCALE_LABEL_KEY[value]),
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
