// ============================================================
// Sinh catalog icon tĩnh cho popup chọn icon board (spec canvas-board-icon).
// ============================================================
//
// Đọc metadata từ `lucide-static` (devDependency) + export của `lucide-react`,
// giao hai nguồn để chỉ giữ icon render được, rồi sinh file tĩnh:
//   src/tools/canvas/lib/icon-catalog.ts
//
// File tĩnh chứa: danh sách tên icon (kebab-case), tag để tìm kiếm, và danh mục
// derive từ keyword. Runtime chỉ import file tĩnh này + component từ lucide-react,
// KHÔNG kéo lucide-static vào bundle.
//
// Chạy một lần (hoặc khi nâng version lucide):
//   npm run gen:icon-catalog
//
// lucide-static không kèm category chính thức (category nằm ở repo lucide, không
// publish trong package). Nên category ở đây derive từ tag + tên bằng bảng từ
// khoá bên dưới. Icon không khớp nhóm nào → danh mục "other".
// ============================================================

import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const tags = require('lucide-static/tags.json');
const lucideReact = require('lucide-react');

// --- Chuyển kebab-case → PascalCase (tên component lucide-react) ---
function toPascal(kebab) {
  return kebab
    .split('-')
    .map((p) => (p.length === 0 ? '' : p[0].toUpperCase() + p.slice(1)))
    .join('');
}

// --- Bảng danh mục: thứ tự = thứ tự hiện trong cột trái popup ---
// Mỗi danh mục khớp khi tên icon HOẶC một tag chứa 1 trong các từ khoá.
// Icon có thể vào nhiều danh mục (khớp danh mục đầu tiên theo thứ tự này).
const CATEGORIES = [
  { id: 'arrows', keywords: ['arrow', 'chevron', 'move', 'corner', 'direction', 'undo', 'redo', 'refresh', 'rotate'] },
  { id: 'files', keywords: ['file', 'folder', 'document', 'clipboard', 'archive', 'paperclip', 'book'] },
  { id: 'communication', keywords: ['mail', 'message', 'chat', 'phone', 'send', 'inbox', 'bell', 'at-sign'] },
  { id: 'media', keywords: ['play', 'pause', 'music', 'video', 'camera', 'image', 'film', 'volume', 'mic', 'headphone'] },
  { id: 'devices', keywords: ['phone', 'laptop', 'monitor', 'tablet', 'tv', 'keyboard', 'mouse', 'printer', 'cpu', 'server', 'battery'] },
  { id: 'weather', keywords: ['sun', 'moon', 'cloud', 'rain', 'snow', 'wind', 'storm', 'thermometer', 'droplet'] },
  { id: 'people', keywords: ['user', 'users', 'person', 'contact', 'baby', 'smile', 'heart'] },
  { id: 'commerce', keywords: ['cart', 'shopping', 'bag', 'credit-card', 'dollar', 'wallet', 'tag', 'gift', 'coin', 'receipt'] },
  { id: 'editing', keywords: ['edit', 'pen', 'pencil', 'brush', 'eraser', 'scissors', 'crop', 'type', 'bold', 'italic', 'highlighter'] },
  { id: 'nature', keywords: ['tree', 'leaf', 'flower', 'bug', 'fish', 'bird', 'cat', 'dog', 'sprout', 'flame', 'mountain'] },
  { id: 'shapes', keywords: ['circle', 'square', 'triangle', 'star', 'hexagon', 'diamond', 'shape', 'box'] },
  { id: 'tools', keywords: ['settings', 'tool', 'wrench', 'hammer', 'gear', 'lock', 'key', 'shield', 'bug', 'filter', 'search', 'zap'] },
];

function categoryOf(name, iconTags) {
  const haystack = [name, ...iconTags].join(' ');
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((k) => haystack.includes(k))) return cat.id;
  }
  return 'other';
}

// --- Danh sách icon lấy từ lucide-react (bản đang render), tag lấy từ lucide-static ---
// Không lấy danh sách từ lucide-static: bản static mới hơn đã đổi tên một số icon
// (VD 'music') → giao 2 nguồn theo tên làm rơi icon lucide-react vẫn có.
// `lucideReact.icons` chỉ chứa tên chuẩn (không alias *Icon / Lucide*).
const kebabByPascal = new Map(Object.keys(tags).map((k) => [toPascal(k), k]));

// Tên không có trong tags.json → tự đổi PascalCase sang kebab. Chỉ để hiển thị /
// lưu; toPascal(kebab) vẫn ra đúng tên component (cụm số giữ nguyên 1 khúc).
function toKebab(pascal) {
  return pascal
    .replace(/([a-z])([A-Z0-9])/g, '$1-$2')
    .replace(/([0-9])([A-Za-z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

const entries = [];
let untagged = 0;
for (const pascal of Object.keys(lucideReact.icons)) {
  let name = kebabByPascal.get(pascal);
  if (!name || toPascal(name) !== pascal) {
    name = toKebab(pascal);
    if (toPascal(name) !== pascal) {
      throw new Error(`[gen-icon-catalog] không đổi được tên ${pascal} sang kebab`);
    }
  }
  const iconTags = Array.isArray(tags[name]) ? tags[name] : [];
  if (iconTags.length === 0) untagged++;
  entries.push({ name, pascal, category: categoryOf(name, iconTags), tags: iconTags });
}
entries.sort((a, b) => a.name.localeCompare(b.name));

// --- Sinh file tĩnh ---
const catalogList = entries
  .map((e) => `  { n: ${JSON.stringify(e.name)}, p: ${JSON.stringify(e.pascal)}, c: ${JSON.stringify(e.category)}, t: ${JSON.stringify(e.tags)} },`)
  .join('\n');

// Không có 'all': popup mở mặc định ở mục Gợi ý (gần đây + theo tên board), không đổ cả bộ.
const categoryIds = [...CATEGORIES.map((c) => c.id), 'other'];

const out = `// ============================================================
// Catalog icon lucide cho popup chọn icon board (spec canvas-board-icon).
// ============================================================
//
// FILE SINH TỰ ĐỘNG — không sửa tay. Chạy lại:
//   npm run gen:icon-catalog
//
// Mỗi mục: n = tên kebab-case (lưu vào board.icon.value), p = tên component
// PascalCase (tra lucide-react lúc render), c = danh mục, t = tag (tìm kiếm).
// ============================================================

export interface IconCatalogEntry {
  /** Tên kebab-case, dùng làm value lưu vào board.icon. */
  n: string;
  /** Tên component PascalCase trong lucide-react. */
  p: string;
  /** Danh mục (xem ICON_CATEGORY_IDS). */
  c: string;
  /** Tag để tìm kiếm. */
  t: string[];
}

/** Id danh mục theo thứ tự hiện trong cột trái popup. 'other' = còn lại. */
export const ICON_CATEGORY_IDS = ${JSON.stringify(categoryIds)} as const;
export type IconCategoryId = (typeof ICON_CATEGORY_IDS)[number];

/** ${entries.length} icon của lucide-react, tag từ lucide-static. */
export const ICON_CATALOG: IconCatalogEntry[] = [
${catalogList}
];
`;

const outPath = resolve(repoRoot, 'src/tools/canvas/lib/icon-catalog.ts');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, out, 'utf8');

console.log(`[gen-icon-catalog] ${entries.length} icon ghi vào ${outPath} (${untagged} icon không có tag)`);
