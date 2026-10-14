// ============================================================
// Chia object thành trường để gửi patch (spec `canvas-outbox`, mục "Gửi theo trường")
// ============================================================
//
// Đơn vị trường:
//   - `type`, `boardId`, `unsortIndex`: mỗi cái 1 trường.
//   - `geometry`: 1 trường (x, y, rộng, cao, lớp luôn đi cùng nhau khi kéo / đổi cỡ).
//   - `data`: mỗi khoá 1 trường (`data.body`, `data.color`, `data.heightMode`...).
//     `data` không phải object thường → cả `data` là 1 trường.
// Không tính: `id` (không đổi), `version` / `updatedAt` / `createdAt` (siêu dữ liệu, đi riêng).
// Patch = `set` (trường → giá trị mới) + `unset` (khoá data đã bị xoá). Tách riêng vì
// `null` là giá trị hợp lệ (VD `data.color: null` = màu mặc định), không dùng để báo xoá.
// Thuần, dùng chung cho client và server giả.
// ============================================================

const TOP_FIELDS = ['type', 'boardId', 'unsortIndex', 'geometry'] as const;
const DATA_PREFIX = 'data.';

type Plain = Record<string, unknown>;

export interface FieldPatch {
  set: Record<string, unknown>;
  unset: string[];
}

function isPlain(value: unknown): value is Plain {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** JSON có sắp khoá: 2 object cùng nội dung khác thứ tự khoá vẫn ra cùng chuỗi. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (!isPlain(v)) return v;
    const sorted: Plain = {};
    for (const k of Object.keys(v).sort()) sorted[k] = v[k];
    return sorted;
  });
}

function same(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

/** Trường khác nhau giữa 2 bản. Trả mảng đã sắp xếp. */
export function diffObjectFields(prev: unknown, next: unknown): string[] {
  const a = isPlain(prev) ? prev : {};
  const b = isPlain(next) ? next : {};
  const out: string[] = [];
  for (const f of TOP_FIELDS) if (!same(a[f], b[f])) out.push(f);
  const da = a.data;
  const db = b.data;
  if (isPlain(da) && isPlain(db)) {
    for (const k of new Set([...Object.keys(da), ...Object.keys(db)])) {
      if (!same(da[k], db[k])) out.push(DATA_PREFIX + k);
    }
  } else if (!same(da, db)) {
    out.push('data');
  }
  return out.sort();
}

/** Lấy giá trị các trường từ object (gọi lúc gửi → luôn là bản mới nhất). */
export function pickFields(obj: unknown, fields: readonly string[]): FieldPatch {
  const o = isPlain(obj) ? obj : {};
  const data = isPlain(o.data) ? o.data : null;
  const patch: FieldPatch = { set: {}, unset: [] };
  for (const f of fields) {
    if (f.startsWith(DATA_PREFIX)) {
      const k = f.slice(DATA_PREFIX.length);
      if (data && k in data) patch.set[f] = data[k];
      else patch.unset.push(f);
    } else {
      patch.set[f] = o[f];
    }
  }
  return patch;
}

/** Áp patch lên bản đang có (server). Trả object mới, không sửa bản cũ. */
export function applyFields(target: unknown, patch: FieldPatch): Plain {
  const base: Plain = isPlain(target) ? { ...target } : {};
  let data: Plain | null = isPlain(base.data) ? { ...base.data } : null;
  for (const [f, v] of Object.entries(patch.set)) {
    if (f.startsWith(DATA_PREFIX)) {
      data ??= {};
      data[f.slice(DATA_PREFIX.length)] = v;
    } else if (f === 'data') {
      data = isPlain(v) ? { ...v } : null;
      base.data = v;
    } else {
      base[f] = v;
    }
  }
  for (const f of patch.unset) {
    if (data && f.startsWith(DATA_PREFIX)) delete data[f.slice(DATA_PREFIX.length)];
  }
  if (data) base.data = data;
  return base;
}

export function isFieldPatch(value: unknown): value is FieldPatch {
  return (
    isPlain(value) &&
    isPlain(value.set) &&
    Array.isArray(value.unset) &&
    value.unset.every((x) => typeof x === 'string')
  );
}
