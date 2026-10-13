/**
 * Quản lý phím tắt tập trung. Spec: `.kiro/specs/shortcuts/` + `.kiro/specs/shortcuts-modal/`.
 *
 * Thêm phím: khai báo trong bảng của nơi sở hữu (defs thuần dữ liệu + handlers),
 * ghép bằng `bindShortcuts`, đăng ký bằng `useShortcutLayer(kind, shortcuts)`.
 * Phím có `display` tự hiện trong modal phím tắt. Bảng phím của tool đăng ký qua
 * `registerShortcutDefs` (trong `src/register-tools.ts`).
 * Không tự gắn `addEventListener('keydown')`.
 */
export type {
  DisplayToken,
  DisplayWay,
  KeyCombo,
  PointerKind,
  Shortcut,
  ShortcutDef,
  ShortcutDisplay,
  ShortcutHandler,
  ShortcutLayerKind,
} from './types';
export { bindShortcuts } from './combo';
export { registerLayer } from './dispatcher';
export { comboKeyLabels, displayWays, formatCombo, shortcutKeys, type KeyLabel } from './format';
export { detectKeyboardPlatform, getKeyboardPlatform, useKeyboardPlatform } from './platform';
export { isMacSecondaryClick, isPrimaryModifier, isZoomWheel } from './pointer';
export {
  ESCAPE_COMBO,
  useEscapeLayer,
  useModalLayer,
  useShortcutDispatcher,
  useShortcutLayer,
} from './useShortcutLayer';
export { GLOBAL_SHORTCUT_DEFS, GLOBAL_SHORTCUTS } from './global-shortcuts';
export { getRegisteredShortcutDefs, getShortcutDef, registerShortcutDefs } from './registry';
