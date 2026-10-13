import type { ShortcutDef } from './types';

/**
 * Sổ bảng phím của các tool. Tool đăng ký 1 lần lúc khởi động (`src/register-tools.ts`),
 * code dùng chung (modal phím tắt, Cài đặt) đọc từ đây, không import ngược vào `src/tools/`.
 *
 * Không reactive: đăng ký xong trước lần render đầu, người đọc gọi lúc render là đủ.
 * Thứ tự đăng ký = thứ tự hiện trong modal (trong cùng 1 nhóm).
 */
const defs: Record<string, ShortcutDef> = {};

export function registerShortcutDefs(table: Readonly<Record<string, ShortcutDef>>): void {
  Object.assign(defs, table);
}

/** Mọi phím tool đã đăng ký, theo thứ tự đăng ký. */
export function getRegisteredShortcutDefs(): Readonly<Record<string, ShortcutDef>> {
  return defs;
}

/** 1 phím theo id. Tool chưa đăng ký (hoặc gõ sai id) → undefined. */
export function getShortcutDef(id: string): ShortcutDef | undefined {
  return defs[id];
}
