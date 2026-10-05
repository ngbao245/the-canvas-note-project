import { FALLBACK_LOCALE, MESSAGES, type Locale, type MessageKey } from './messages';

/**
 * Phần dịch thuần, không dính React: tra key, chọn dạng số nhiều, thay `{biến}`, định dạng số.
 * Hook và hàm ngoài React đều gọi qua đây để cùng một cách xử lý.
 */

export type TranslateParams = Record<string, string | number>;

// Cache Intl: tạo Intl.* tốn hơn tra Map, mà hàm dịch chạy mỗi lần render.
// Number format key theo ngôn ngữ + số chữ số thập phân ('vi:1', 'en:auto').
const numberFormats = new Map<string, Intl.NumberFormat>();
const pluralRules = new Map<Locale, Intl.PluralRules>();

function getNumberFormat(locale: Locale, fractionDigits?: number): Intl.NumberFormat {
  const cacheKey = `${locale}:${fractionDigits ?? 'auto'}`;
  let fmt = numberFormats.get(cacheKey);
  if (!fmt) {
    fmt = new Intl.NumberFormat(
      locale,
      fractionDigits === undefined
        ? undefined
        : { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits },
    );
    numberFormats.set(cacheKey, fmt);
  }
  return fmt;
}

function getPluralRules(locale: Locale): Intl.PluralRules {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRules.set(locale, rules);
  }
  return rules;
}

/**
 * Định dạng số theo ngôn ngữ: vi 1.234, en 1,234.
 * Có `fractionDigits` thì luôn đúng số chữ số thập phân đó (1 → vi "1,0", en "1.0").
 */
export function formatNumberFor(locale: Locale, value: number, fractionDigits?: number): string {
  return getNumberFormat(locale, fractionDigits).format(value);
}

function lookup(locale: Locale, key: string): unknown {
  let node: unknown = MESSAGES[locale];
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/** Từ 1 node (chuỗi hoặc nhóm số nhiều) ra câu cụ thể. Không ra được thì trả undefined. */
function pickTemplate(locale: Locale, node: unknown, params?: TranslateParams): string | undefined {
  if (typeof node === 'string') return node;
  if (typeof node !== 'object' || node === null) return undefined;
  const forms = node as Record<string, unknown>;
  const count = params?.count;
  const category = typeof count === 'number' ? getPluralRules(locale).select(count) : 'other';
  const chosen = forms[category] ?? forms.other;
  return typeof chosen === 'string' ? chosen : undefined;
}

function interpolate(locale: Locale, template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    if (value === undefined) return match;
    return typeof value === 'number' ? formatNumberFor(locale, value) : value;
  });
}

/**
 * Dịch 1 key theo ngôn ngữ. Thiếu chữ ở ngôn ngữ hiện tại thì lấy bản dự phòng (en),
 * vẫn thiếu thì trả lại chính key để dễ thấy trên UI.
 */
export function translateFor(locale: Locale, key: MessageKey, params?: TranslateParams): string {
  const template =
    pickTemplate(locale, lookup(locale, key), params) ??
    pickTemplate(FALLBACK_LOCALE, lookup(FALLBACK_LOCALE, key), params);
  if (template === undefined) {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] thiếu chữ cho key "${key}"`);
    }
    return key;
  }
  return interpolate(locale, template, params);
}
