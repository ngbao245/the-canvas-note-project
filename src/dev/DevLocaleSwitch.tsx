import { LOCALES, useLocaleStore } from '@/lib/i18n';

/**
 * Nút nổi đổi ngôn ngữ nhanh, CHỈ cho dev (App.tsx lazy-load sau cờ import.meta.env.DEV,
 * bản build không chứa file này). Ghi thẳng vào locale store nên Cài đặt cũng thấy giá trị mới.
 * Chữ VI / EN là mã ngôn ngữ của công cụ dev, cố ý không qua bộ dịch.
 */
export default function DevLocaleSwitch() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <div
      role="radiogroup"
      aria-label="Dev locale"
      className="fixed bottom-3 right-6 z-dev flex overflow-hidden rounded-md border border-border bg-popover/90 text-[11px] font-medium shadow-md backdrop-blur"
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLocale(code)}
            className={`cursor-pointer px-2 py-1 uppercase transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
