import type { KeyCombo, Shortcut, ShortcutDef, ShortcutHandler } from './types';

/** `key` 1 ký tự so không phân biệt hoa/thường → Caps Lock / Shift không làm lệch. */
function keyEquals(expected: string, actual: string): boolean {
  if (expected.length === 1) return expected.toLowerCase() === actual.toLowerCase();
  return expected === actual;
}

export function matchCombo(combo: KeyCombo, e: KeyboardEvent): boolean {
  if (combo.pointer !== undefined) return false; // thao tác chuột, chỉ để hiển thị
  if (combo.code === undefined && combo.key === undefined) return false;
  if (Boolean(combo.mod) !== (e.ctrlKey || e.metaKey)) return false;
  if (Boolean(combo.alt) !== e.altKey) return false;
  if (combo.shift !== 'any' && Boolean(combo.shift) !== e.shiftKey) return false;
  if (combo.code !== undefined && combo.code !== e.code) return false;
  if (combo.key !== undefined && !keyEquals(combo.key, e.key)) return false;
  return true;
}

/** Chuỗi đại diện tổ hợp, dùng để so trùng. */
export function comboId(combo: KeyCombo): string {
  const shift = combo.shift === 'any' ? 'shift?' : combo.shift ? 'shift' : '';
  return [
    combo.mod ? 'mod' : '',
    shift,
    combo.alt ? 'alt' : '',
    combo.pointer !== undefined ? `pointer:${combo.pointer}` : '',
    combo.code !== undefined ? `code:${combo.code}` : '',
    combo.key !== undefined
      ? `key:${combo.key.length === 1 ? combo.key.toLowerCase() : combo.key}`
      : '',
  ]
    .filter(Boolean)
    .join('+');
}

/**
 * Ghép phần dữ liệu (defs) với phần hành động (handlers) theo id.
 * `handlers` có thể chỉ chứa 1 phần id của `defs` (VD phím Space nằm ở hook pointer,
 * phím Delete ở CanvasApp) → mỗi nơi đăng ký phần của mình, bảng Cài đặt vẫn đọc đủ defs.
 * Id gõ sai (không có trong defs) → tsc báo. Thứ tự = thứ tự khai báo trong defs.
 */
export function bindShortcuts<D extends Record<string, ShortcutDef>, K extends keyof D & string>(
  defs: D,
  handlers: Record<K, ShortcutHandler>,
): Shortcut[] {
  const out: Shortcut[] = [];
  for (const id of Object.keys(defs)) {
    if (!(id in handlers)) continue;
    out.push({ id, ...defs[id], ...handlers[id as K] });
  }
  return out;
}
