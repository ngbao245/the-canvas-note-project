import type { KeyboardPlatform } from '@/stores/keyboard-platform-store';
import type { DisplayWay, KeyCombo, ShortcutDef } from './types';

/**
 * Đổi tổ hợp phím thành chữ hiển thị, theo kiểu bàn phím.
 *   Windows / Linux: Ctrl Shift Alt Z → "Ctrl+Shift+Z".
 *   macOS:           ⌘ Shift Alt Z    → "⌘+Shift+Z".
 * Chỉ phím chính đổi theo OS (Ctrl ↔ ⌘). Phím 2 OS đều có (Shift, Alt, Enter, Backspace)
 * giữ cùng tên chữ, không dùng ký hiệu Apple (⇧ ⌥ ↩ ⌫): cùng phím thì cùng tên.
 * Tên phím không dịch (core rule). `title` là tên đầy đủ cho tooltip ("Command").
 *
 * `platform` bắt buộc: trong component truyền `useKeyboardPlatform()` để nhãn đổi ngay khi
 * user đổi Kiểu bàn phím. Hàm thuần, không đọc store.
 */

export interface KeyLabel {
  label: string;
  title?: string;
  /**
   * ⌘ vẽ bằng icon SVG trong `Kbd` (ShortcutKeys.tsx): font Windows không có ⌘ nên lấy font
   * dự phòng, vẽ nhỏ và lệch. `label` vẫn giữ ký tự cho tooltip, câu mô tả và ô tìm.
   */
  glyph?: 'command';
}

const KEY_LABELS: Record<string, string> = {
  Escape: 'Esc',
  ' ': 'Space',
};

const CODE_LABELS: Record<string, string> = {
  BracketLeft: '[',
  BracketRight: ']',
  Comma: ',',
  Period: '.',
  Space: 'Space',
};

function mainKeyLabel(combo: KeyCombo): KeyLabel | null {
  if (combo.key !== undefined) {
    const label =
      KEY_LABELS[combo.key] ?? (combo.key.length === 1 ? combo.key.toUpperCase() : combo.key);
    return { label };
  }
  if (combo.code === undefined) return null;
  const code = combo.code;
  if (CODE_LABELS[code]) return { label: CODE_LABELS[code] };
  if (code.startsWith('Key')) return { label: code.slice(3) };
  if (code.startsWith('Digit')) return { label: code.slice(5) };
  return { label: code };
}

/** Các phím của 1 tổ hợp theo thứ tự hiển thị. Không gồm phần chuột (`pointer`). */
export function comboKeyLabels(combo: KeyCombo, platform: KeyboardPlatform): KeyLabel[] {
  const out: KeyLabel[] = [];
  if (combo.mod) {
    out.push(
      platform === 'macos' ? { label: '⌘', title: 'Command', glyph: 'command' } : { label: 'Ctrl' },
    );
  }
  if (combo.shift === true) out.push({ label: 'Shift' });
  if (combo.alt) out.push({ label: 'Alt' });
  const main = mainKeyLabel(combo);
  if (main) out.push(main);
  return out;
}

/**
 * 1 tổ hợp dạng chữ, VD "Ctrl+Shift+Z" / "⌘+Shift+Z". Dùng cho tooltip / câu mô tả.
 * Tổ hợp chuột chỉ trả phần phím bổ trợ ("Ctrl" / "⌘"); câu dịch tự viết phần chuột
 * ("giữ {keys} và lăn chuột") để đúng ngữ pháp từng ngôn ngữ.
 */
export function formatCombo(combo: KeyCombo, platform: KeyboardPlatform): string {
  return comboKeyLabels(combo, platform)
    .map((k) => k.label)
    .join('+');
}

/**
 * Tổ hợp chính của 1 phím dạng chữ (tổ hợp hiển thị đầu tiên), để chèn vào tooltip
 * thay vì ghi cứng trong file dịch. Đổi phím trong bảng là tooltip tự theo.
 */
export function shortcutKeys(def: ShortcutDef, platform: KeyboardPlatform): string {
  const main = def.combos.find((c) => !c.alias) ?? def.combos[0];
  return main ? formatCombo(main, platform) : '';
}

/**
 * Các cách bấm hiển thị của 1 phím. Có `display.ways` thì dùng nguyên; không thì sinh
 * từ `combos` (bỏ `alias`), mỗi tổ hợp 1 cách, phần chuột thành icon.
 */
export function displayWays(def: ShortcutDef): readonly DisplayWay[] {
  if (def.display?.ways) return def.display.ways;
  return def.combos
    .filter((c) => !c.alias)
    .map((c) => (c.pointer ? [{ combo: c }, { pointer: c.pointer }] : [{ combo: c }]));
}
