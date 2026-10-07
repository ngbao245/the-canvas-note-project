import {
  DEFAULT_THEME,
  useResolvedTheme,
  useThemeStore,
  type Theme,
  type ThemePreference,
} from '@/stores/theme-store';
import { DEFAULT_UI_STYLE, useUiStyleStore, type UiStyle } from '@/stores/ui-style-store';
import {
  DEFAULT_INTERFACE_SIZE,
  useInterfaceStore,
  type InterfaceSize,
} from '@/stores/interface-store';
import { Field, OptionCard, Section } from '../SettingsBlocks';
import { OrSeparator, ShortcutWays } from '@/components/shortcuts/ShortcutKeys';
import { GLOBAL_SHORTCUT_DEFS } from '@/lib/shortcuts';
import { useI18n, type MessageKey } from '@/lib/i18n';

/**
 * Cài đặt → Giao diện: theme, phong cách, kích thước giao diện.
 * Chọn bộ font để sau (chưa chốt font).
 */

const SIZE_OPTIONS: { value: InterfaceSize; labelKey: MessageKey }[] = [
  { value: 'small', labelKey: 'SETTINGS.APPEARANCE.SIZE.SMALL' },
  { value: 'medium', labelKey: 'SETTINGS.APPEARANCE.SIZE.MEDIUM' },
  { value: 'large', labelKey: 'SETTINGS.APPEARANCE.SIZE.LARGE' },
];

const THEME_OPTIONS: { value: ThemePreference; labelKey: MessageKey }[] = [
  { value: 'light', labelKey: 'SETTINGS.APPEARANCE.MODE.LIGHT' },
  { value: 'dark', labelKey: 'SETTINGS.APPEARANCE.MODE.DARK' },
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

  const size = useInterfaceStore((s) => s.size);
  const setSize = useInterfaceStore((s) => s.setSize);

  const reset = () => {
    setTheme(DEFAULT_THEME);
    setStyle(DEFAULT_UI_STYLE);
    setSize(DEFAULT_INTERFACE_SIZE);
  };

  return (
    <Section title={title} description={description} onReset={reset}>
      <Field
        label={t('SETTINGS.APPEARANCE.THEME')}
        // Cùng bề rộng với lưới thẻ bên dưới → gợi ý phím thẳng mép phải thẻ cuối.
        headerClassName="sm:max-w-lg"
        aside={<ShortcutWays def={GLOBAL_SHORTCUT_DEFS['app.toggle-theme']} />}
      >
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

      <Field
        label={t('SETTINGS.APPEARANCE.SIZE.TITLE')}
        // Cùng bề rộng với lưới thẻ bên dưới → gợi ý phím thẳng mép phải thẻ Lớn.
        headerClassName="sm:max-w-lg"
        aside={
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShortcutWays def={GLOBAL_SHORTCUT_DEFS['app.size-down']} />
            <OrSeparator />
            <ShortcutWays def={GLOBAL_SHORTCUT_DEFS['app.size-up']} />
          </span>
        }
      >
        <div
          role="radiogroup"
          aria-label={t('SETTINGS.APPEARANCE.SIZE.TITLE')}
          className="grid grid-cols-3 gap-3 sm:max-w-lg"
        >
          {SIZE_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              selected={size === opt.value}
              onSelect={() => setSize(opt.value)}
              label={t(opt.labelKey)}
              // Thẻ không có nhãn vẫn giữ 1 dòng trống → 3 thẻ cao bằng nhau, tên mức thẳng hàng.
              hint={
                opt.value === DEFAULT_INTERFACE_SIZE
                  ? t('SETTINGS.APPEARANCE.SIZE.RECOMMENDED')
                  : '\u00a0'
              }
            >
              <SizePreview size={opt.value} />
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
    </Section>
  );
}

/**
 * Xem trước theme: ảnh SVG vẽ sẵn cảnh canvas bibo (`public/settings/v14-meo-den/`, vẽ ở ~160px = cỡ hiển thị thật).
 * Màu trong ảnh là bản chụp token light/dark lúc vẽ, đổi token thì vẽ lại ảnh.
 * Ảnh chỉ để trang trí (tên theme đã có ở label thẻ) → alt rỗng.
 *
 * Mèo trong ảnh đổi theo theme app đang áp dụng (không theo thẻ): app sáng → cả 3 mèo đen,
 * app tối → cả 3 mèo trắng. <img> không đọc được biến CSS của trang nên mỗi thẻ có sẵn 2 file
 * `-cat-black` / `-cat-white`, chọn file theo `useResolvedTheme()`.
 */
const CAT_BY_THEME: Record<Theme, 'black' | 'white'> = { light: 'black', dark: 'white' };

function ThemePreview({ pref }: { pref: ThemePreference }) {
  const cat = CAT_BY_THEME[useResolvedTheme()];
  return (
    <img
      src={`${import.meta.env.BASE_URL}settings/v14-meo-den/theme-${pref}-cat-${cat}.svg`}
      alt=""
      aria-hidden="true"
      width={320}
      height={224}
      draggable={false}
      className="mb-2 block h-auto w-full select-none"
    />
  );
}

/*
 * Tỉ lệ đo từ ảnh Milanote (khung 320px, mức Lớn), đổi sang % bề ngang khung (cqw).
 * Tính theo khung chứ không theo px → thẻ rộng hẹp bao nhiêu thì bố cục vẫn giữ y tỉ lệ.
 *   lề trái 40px, lề trên ~34px, tiêu đề 22px, khoảng cách 12px, chữ thân 19px.
 */
const SIZE_PREVIEW = {
  padX: 12.5,
  padTop: 9,
  title: 9.5,
  gap: 3,
  body: 8,
  /** line-height chữ thân. */
  leading: 1.6,
} as const;
// Kiểm chiều cao (mức Lớn, đơn vị cqw, thẻ cao 70): 9 + 9.5×1.25 + 3 + 8×1.6×3 ≈ 62 → đủ 3 dòng, còn lề đáy.

/*
 * Tỉ lệ RIÊNG cho hình xem trước, cố ý chênh nhiều để nhìn ra ngay nhỏ / vừa / lớn.
 * Không phải tỉ lệ thật canvas dùng (INTERFACE_SCALE trong interface-store, không đụng).
 */
const SIZE_PREVIEW_SCALE: Record<InterfaceSize, number> = {
  small: 0.6,
  medium: 0.78,
  large: 1,
};
// Mức Lớn (1) ứng với chữ to nhất trong thẻ; Vừa (mặc định) nằm giữa.

/**
 * Xem trước kích thước (Milanote parity): 1 card note cắt ngang. Lề cố định, chỉ chữ đổi cỡ.
 * Đoạn thân rộng theo `em` → ngắt dòng giống nhau ở cả 3 mức, mức to chỉ thấy ít chữ hơn;
 * chữ tràn phải mờ dần. Khung cùng tỉ lệ 320x224 với ảnh theme để 2 hàng thẻ cao bằng nhau.
 * Màu theo token → tự đổi theo theme.
 */
function SizePreview({ size }: { size: InterfaceSize }) {
  const { t } = useI18n();
  const s = SIZE_PREVIEW_SCALE[size];
  const cqw = (n: number, scaled = true) => `${scaled ? n * s : n}cqw`;
  return (
    <div
      aria-hidden="true"
      className="mb-2 aspect-[320/224] w-full select-none overflow-hidden rounded-xl border border-border bg-muted [container-type:inline-size]"
    >
      <div
        style={{
          padding: `${cqw(SIZE_PREVIEW.padTop, false)} 0 0 ${cqw(SIZE_PREVIEW.padX, false)}`,
        }}
      >
        {/* Hàng tiêu đề cao cố định (= cỡ chữ mức Lớn × leading-tight 1.25), chữ bám đáy hàng →
            3 thẻ cùng đường chân chữ tiêu đề, và đoạn thân bắt đầu cùng 1 độ cao. */}
        <div className="flex items-end" style={{ height: cqw(SIZE_PREVIEW.title * 1.25, false) }}>
          <div
            className="whitespace-nowrap font-serif font-semibold leading-tight text-foreground"
            style={{ fontSize: cqw(SIZE_PREVIEW.title) }}
          >
            {t('SETTINGS.APPEARANCE.SIZE.PREVIEW_TITLE')}
          </div>
        </div>
        {/* Mask đặt trên khối rộng bằng khung → mờ dần theo mép phải thẻ, không theo đoạn chữ.
            Khối thân cao cố định = 3 dòng ở mức Lớn (chữ to nhất), như nhau ở cả 3 thẻ → mức nào
            cũng thấy đủ 3 dòng. Chữ to chỉ bị cắt sớm theo chiều ngang (ít chữ hơn mỗi dòng). */}
        <div
          className="overflow-hidden [mask-image:linear-gradient(to_right,#000_50%,transparent_96%)]"
          style={{
            height: `calc(${cqw(SIZE_PREVIEW.gap, false)} + ${cqw(
              SIZE_PREVIEW.body * SIZE_PREVIEW_SCALE.large * SIZE_PREVIEW.leading * 3,
              false,
            )})`,
          }}
        >
          <p
            // Cố định 3 dòng ở cả 3 mức: mức Nhỏ chữ bé, khung còn chỗ sẽ lộ dòng 4.
            className="line-clamp-3 text-foreground/90"
            style={{
              fontSize: cqw(SIZE_PREVIEW.body),
              lineHeight: SIZE_PREVIEW.leading,
              // Khoảng cách cố định (không nhân tỉ lệ) để đoạn thân 3 thẻ cùng bắt đầu 1 chỗ.
              marginTop: cqw(SIZE_PREVIEW.gap, false),
              width: '16em',
            }}
          >
            {t('SETTINGS.APPEARANCE.SIZE.PREVIEW_BODY')}
          </p>
        </div>
      </div>
    </div>
  );
}
