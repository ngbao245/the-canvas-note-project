import type { MessageKey } from '@/lib/i18n';

/**
 * Lớp phím, duyệt theo thứ tự: global → overlay (mở sau trước) → panel → tool.
 * - global: luôn chạy, kể cả khi modal mở.
 * - overlay: popup, menu, dialog, modal. Đăng ký khi mở, gỡ khi đóng.
 * - panel: panel phụ trong tool (Unsort).
 * - tool: phím của tool đang mount (Canvas).
 */
export type ShortcutLayerKind = 'global' | 'overlay' | 'panel' | 'tool';

/** Thao tác chuột trong bảng hiển thị. Hành động nằm ở listener chuột của nơi sở hữu. */
export type PointerKind = 'wheel' | 'click' | 'double-click' | 'drag' | 'middle-drag';

/**
 * 1 cách bấm. Ctrl và Cmd gộp thành `mod`. Modifier không ghi = phải KHÔNG giữ.
 * Chữ cái và phím đặc biệt dùng `key` ('z', 'Escape', 'Delete'), so không phân biệt hoa/thường.
 * Số và phím đổi ký tự khi giữ Shift dùng `code` ('Digit1', 'BracketLeft').
 *
 * Tổ hợp chỉ có phím bổ trợ (không `key` / `code`) hoặc có `pointer` thì bộ điều phối
 * không bao giờ khớp: chỉ để hiển thị (VD Ctrl + lăn chuột).
 */
export interface KeyCombo {
  mod?: boolean;
  /** 'any': nhận cả có lẫn không Shift (VD '+' gõ được bằng Shift+= hoặc numpad). */
  shift?: boolean | 'any';
  alt?: boolean;
  code?: string;
  key?: string;
  /** Cách nhận thay thế (VD phím vật lý Comma cho '<'), không hiện trong bảng. */
  alias?: boolean;
  /** Thao tác chuột đi kèm phím bổ trợ. Chỉ để hiển thị. */
  pointer?: PointerKind;
}

/** 1 mảnh trong 1 cách bấm hiển thị: phím (tổ hợp), chữ nối (dịch), hoặc icon chuột. */
export type DisplayToken = { combo: KeyCombo } | { text: MessageKey } | { pointer: PointerKind };

/** 1 cách bấm hiển thị = các mảnh nối tiếp, VD [giữ][Space][kéo]. */
export type DisplayWay = readonly DisplayToken[];

/** Có phần này thì phím hiện trong modal phím tắt. */
export interface ShortcutDisplay {
  groupKey: MessageKey;
  labelKey: MessageKey;
  /** Tiêu đề con trong nhóm (VD Markdown: "Gõ ở đầu dòng mới"). Dòng liền nhau cùng key gom dưới 1 tiêu đề. */
  subgroupKey?: MessageKey;
  /**
   * Cách bấm hiển thị, thay cho cách tự sinh từ `combos`. Dùng khi cần chữ nối
   * ("giữ Space và kéo") hoặc thao tác do nơi khác xử lý (Tiptap, chuột).
   * Nhiều cách → nối bằng "hoặc".
   */
  ways?: readonly DisplayWay[];
}

/**
 * Phần dữ liệu thuần của 1 phím: không import store, dùng được cho bảng hiển thị.
 * `combos: []` + `display.ways` = dòng chỉ hiển thị (không có handler).
 */
export interface ShortcutDef {
  combos: readonly KeyCombo[];
  /** Chạy cả khi focus ở ô gõ chữ. Mặc định: chỉ lớp overlay được chạy. */
  allowInEditable?: boolean;
  /** Mặc định true: xử lý xong thì preventDefault + stopPropagation. */
  consume?: boolean;
  display?: ShortcutDisplay;
}

/** Phần hành động. Đọc state qua getState() lúc bấm, không qua closure. */
export interface ShortcutHandler {
  /** false → coi như phím không tồn tại, rơi xuống lớp dưới. */
  when?: () => boolean;
  /** Trả false nếu không xử lý (VD không có gì đang chọn) → rơi xuống lớp dưới. */
  run: (e: KeyboardEvent) => boolean | void;
  /** Phím giữ: gọi khi thả phím, khi cửa sổ mất focus, hoặc khi lớp bị gỡ. */
  release?: () => void;
}

export interface Shortcut extends ShortcutDef, ShortcutHandler {
  id: string;
}
