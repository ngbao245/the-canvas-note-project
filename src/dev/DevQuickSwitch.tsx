import { LOCALES, useLocaleStore } from '@/lib/i18n';
import { useKeyboardPlatform } from '@/lib/shortcuts';
import { useKeyboardPlatformStore, type KeyboardPlatform } from '@/stores/keyboard-platform-store';

/**
 * Nút nổi CHỈ cho dev (App.tsx lazy-load sau cờ import.meta.env.DEV, bản build không chứa
 * file này): đổi nhanh kiểu bàn phím (WIN / MAC) và ngôn ngữ (VI / EN).
 * Ghi thẳng vào store nên Cài đặt cũng thấy giá trị mới. Chữ trên nút là mã của công cụ dev,
 * cố ý không qua bộ dịch.
 */

const PLATFORMS: { value: KeyboardPlatform; label: string }[] = [
  { value: 'windows-linux', label: 'win' },
  { value: 'macos', label: 'mac' },
];

const GROUP_CLS =
  'flex overflow-hidden rounded-md border border-border bg-popover/90 text-[11px] font-medium shadow-md backdrop-blur';

export default function DevQuickSwitch() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  // Tô theo platform đang dùng (kể cả khi Cài đặt để Tự động). Bấm = chọn cố định kiểu đó.
  const platform = useKeyboardPlatform();
  const setPlatformPref = useKeyboardPlatformStore((s) => s.setPref);

  return (
    <div className="fixed bottom-3 right-6 z-dev flex flex-col items-end gap-1.5">
      <div role="radiogroup" aria-label="Dev keyboard platform" className={GROUP_CLS}>
        {PLATFORMS.map((p) => (
          <DevOption
            key={p.value}
            label={p.label}
            active={p.value === platform}
            onClick={() => setPlatformPref(p.value)}
          />
        ))}
      </div>
      <div role="radiogroup" aria-label="Dev locale" className={GROUP_CLS}>
        {LOCALES.map((code) => (
          <DevOption
            key={code}
            label={code}
            active={code === locale}
            onClick={() => setLocale(code)}
          />
        ))}
      </div>
    </div>
  );
}

function DevOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`px-2 py-1 uppercase transition-colors duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );
}
