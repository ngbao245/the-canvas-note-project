import { useCallback } from 'react';
import { useLocaleStore } from './locale-store';
import type { MessageKey } from './messages';
import { formatNumberFor, translateFor, type TranslateParams } from './translate';

/**
 * Cửa vào duy nhất của i18n. Component dùng `useI18n()`, code ngoài React dùng `t()` / `formatNumber()`.
 *
 *   const { t, formatNumber } = useI18n();
 *   t('CANVAS.COUNT.OBJECT', { count: 3 }) // en: "3 objects", vi: "3 object"
 *   formatNumber(1.5, 1)                   // vi: "1,5", en: "1.5"
 *
 * Đổi sang react-i18next sau này: giữ nguyên chữ ký `t(key, params)`, chỉ thay phần bên dưới.
 */

export { LOCALES, type Locale, type MessageKey } from './messages';
export type { TranslateParams } from './translate';
export { useLocaleStore, applyLangAttr } from './locale-store';

export function useI18n() {
  const locale = useLocaleStore((s) => s.locale);
  // useCallback: t/formatNumber hay được đưa vào deps của useMemo/useEffect ở component dùng.
  const t = useCallback(
    (key: MessageKey, params?: TranslateParams) => translateFor(locale, key, params),
    [locale],
  );
  const formatNumber = useCallback(
    (value: number, fractionDigits?: number) => formatNumberFor(locale, value, fractionDigits),
    [locale],
  );
  return { locale, t, formatNumber };
}

/**
 * Dịch ngoài React (engine, hàm tạo object). Đọc ngôn ngữ tại thời điểm gọi,
 * không tự cập nhật khi đổi ngôn ngữ — chỉ dùng cho chữ tạo 1 lần (vd tên mặc định lúc tạo).
 */
export function t(key: MessageKey, params?: TranslateParams): string {
  return translateFor(useLocaleStore.getState().locale, key, params);
}

export function formatNumber(value: number, fractionDigits?: number): string {
  return formatNumberFor(useLocaleStore.getState().locale, value, fractionDigits);
}
