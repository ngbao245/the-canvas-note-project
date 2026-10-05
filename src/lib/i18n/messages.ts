import vi from './locales/vi.json';
import enJson from './locales/en.json';

/**
 * Bộ chữ theo ngôn ngữ. `vi.json` là nguồn chuẩn: kiểu key lấy từ đây.
 * `en` khai báo theo kiểu của vi → thiếu key nào thì `tsc` báo lỗi ngay tại dòng gán.
 *
 * Key số nhiều là object có ít nhất `other` (vd `{ "one": "...", "other": "..." }`).
 * Tiếng Việt không có số nhiều nên chỉ cần `other`.
 */

export type Messages = typeof vi;

const en: Messages = enJson;

export const LOCALES = ['vi', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Ngôn ngữ dự phòng khi không nhận ra ngôn ngữ trình duyệt hoặc thiếu chữ. */
export const FALLBACK_LOCALE: Locale = 'en';

export const MESSAGES: Record<Locale, Messages> = { vi, en };

type PluralNode = { other: string };

/** Mọi đường dẫn key tới 1 câu (chuỗi hoặc nhóm số nhiều), dạng `CANVAS.COUNT.OBJECT`. */
export type MessageKey = KeyPaths<Messages>;

type KeyPaths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends PluralNode
      ? `${P}${K}`
      : KeyPaths<T[K], `${P}${K}.`>;
}[keyof T & string];
