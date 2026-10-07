import { isEditableTarget, isImeComposing } from '@/lib/dom';
import { comboId, matchCombo } from './combo';
import type { Shortcut, ShortcutLayerKind } from './types';

/**
 * Bộ điều phối phím duy nhất của app: 1 listener keydown + keyup ở window capture.
 *
 * Duyệt lớp theo KIND_ORDER, cùng loại thì lớp đăng ký sau trước. Phím đầu tiên khớp
 * tổ hợp + thoả `when` + `run` không trả false thì xử lý xong, dừng duyệt. Lớp có
 * `blocking` (modal, dialog xác nhận) chặn mọi lớp bên dưới nó.
 *
 * Capture ở window chạy trước listener của phần tử (Tiptap, ô nhập) → phím đã xử lý
 * được stopPropagation thì phần tử không nhận. Phím lớp tool/panel bỏ qua khi đang gõ
 * nên editor vẫn nhận phím như thường.
 */

interface Layer {
  kind: ShortcutLayerKind;
  blocking: boolean;
  getShortcuts: () => readonly Shortcut[];
}

const KIND_ORDER: readonly ShortcutLayerKind[] = ['global', 'overlay', 'panel', 'tool'];

const layers: Layer[] = [];
/** Phím giữ đang nhấn, theo e.code → gọi release khi thả. */
const held = new Map<string, { shortcut: Shortcut; layer: Layer }>();

export function registerLayer(
  kind: ShortcutLayerKind,
  getShortcuts: () => readonly Shortcut[],
  blocking = false,
): () => void {
  const layer: Layer = { kind, blocking, getShortcuts };
  if (import.meta.env.DEV) warnDuplicates(layer);
  layers.push(layer);
  return () => {
    const i = layers.indexOf(layer);
    if (i >= 0) layers.splice(i, 1);
    for (const [code, h] of held) {
      if (h.layer !== layer) continue;
      held.delete(code);
      h.shortcut.release?.();
    }
  };
}

export function installShortcutDispatcher(): () => void {
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', releaseAll);
  return () => {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('blur', releaseAll);
    releaseAll();
  };
}

function orderedLayers(): Layer[] {
  const out: Layer[] = [];
  for (const kind of KIND_ORDER) {
    for (let i = layers.length - 1; i >= 0; i--) {
      if (layers[i].kind === kind) out.push(layers[i]);
    }
  }
  return out;
}

function onKeyDown(e: KeyboardEvent): void {
  if (isImeComposing(e)) return;
  const editable = isEditableTarget(e.target);
  for (const layer of orderedLayers()) {
    for (const s of layer.getShortcuts()) {
      if (tryRun(s, layer, e, editable)) return;
    }
    if (layer.blocking) return;
  }
}

function tryRun(s: Shortcut, layer: Layer, e: KeyboardEvent, editable: boolean): boolean {
  if (editable && !(s.allowInEditable ?? layer.kind === 'overlay')) return false;
  if (!s.combos.some((c) => matchCombo(c, e))) return false;
  if (s.when && !s.when()) return false;
  if (s.run(e) === false) return false;
  if (s.consume !== false) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (s.release) held.set(e.code, { shortcut: s, layer });
  return true;
}

function onKeyUp(e: KeyboardEvent): void {
  const h = held.get(e.code);
  if (!h) return;
  held.delete(e.code);
  h.shortcut.release?.();
}

/** Alt+Tab khi đang giữ phím → không có keyup, phải tự thả. */
function releaseAll(): void {
  const list = Array.from(held.values());
  held.clear();
  for (const h of list) h.shortcut.release?.();
}

/**
 * Chỉ dev: báo trùng tổ hợp trong cùng loại lớp, hoặc trùng với lớp global.
 * Lớp overlay là phím nội bộ của popup (Esc, Enter) nên không kiểm.
 */
function warnDuplicates(layer: Layer): void {
  if (layer.kind === 'overlay') return;
  const seen = new Map<string, string>();
  const peers = layers.filter(
    (l) =>
      l.kind !== 'overlay' &&
      (l.kind === layer.kind || l.kind === 'global' || layer.kind === 'global'),
  );
  for (const l of peers) {
    for (const s of l.getShortcuts()) for (const c of s.combos) seen.set(comboId(c), s.id);
  }
  for (const s of layer.getShortcuts()) {
    for (const c of s.combos) {
      const id = comboId(c);
      const other = seen.get(id);
      if (other !== undefined && other !== s.id) {
        console.warn(`[shortcuts] Trùng tổ hợp ${id}: "${other}" và "${s.id}"`);
      }
      seen.set(id, s.id);
    }
  }
}
