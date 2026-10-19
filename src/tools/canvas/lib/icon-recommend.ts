// Gợi ý icon cho mục "Gợi ý" của popup icon board (spec canvas-board-icon).
// 3 nhóm, không trùng nhau, theo thứ tự ưu tiên:
//   1. recent  — icon dùng gần đây (store riêng máy).
//   2. byName  — icon có tên / tag khớp từ trong tên board (tag lucide tiếng Anh,
//                tên board tiếng Việt thường không khớp → nhóm rỗng, không sao).
//   3. popular — danh sách cố định hay dùng, lấp chỗ khi 2 nhóm trên ít.

import { ICON_CATALOG, type IconCatalogEntry } from './icon-catalog';

export interface IconRecommendation {
  recent: IconCatalogEntry[];
  byName: IconCatalogEntry[];
  popular: IconCatalogEntry[];
}

const BY_NAME_MAX = 24;
const MIN_TOKEN_LENGTH = 3;
/** Từ không mang nghĩa chủ đề (gồm tên mặc định "New Board"). */
const STOP_WORDS = new Set(['new', 'board', 'the', 'and', 'for', 'with', 'untitled']);

const POPULAR_NAMES = [
  'star', 'heart', 'house', 'folder', 'book-open', 'briefcase', 'calendar', 'camera',
  'code', 'coffee', 'flag', 'gift', 'globe', 'graduation-cap', 'image', 'lightbulb',
  'map-pin', 'music', 'palette', 'pencil', 'rocket', 'shopping-cart', 'sun', 'target',
  'users', 'zap', 'bookmark', 'plane', 'dumbbell', 'utensils',
];

const BY_NAME = new Map(ICON_CATALOG.map((e) => [e.n, e]));

export function recommendIcons(boardName: string, recentNames: readonly string[]): IconRecommendation {
  const used = new Set<string>();
  const take = (e: IconCatalogEntry | undefined): e is IconCatalogEntry => {
    if (!e || used.has(e.n)) return false;
    used.add(e.n);
    return true;
  };

  const recent = recentNames.map((n) => BY_NAME.get(n)).filter(take);

  // Khớp tên icon đứng trước khớp tag ("music" trước "disc" có tag music).
  const tokens = boardTokens(boardName);
  const byName =
    tokens.length === 0
      ? []
      : [
          ...ICON_CATALOG.filter((e) => matchesName(e, tokens)),
          ...ICON_CATALOG.filter((e) => !matchesName(e, tokens) && matchesTag(e, tokens)),
        ]
          .filter(take)
          .slice(0, BY_NAME_MAX);

  const popular = POPULAR_NAMES.map((n) => BY_NAME.get(n)).filter(take);

  return { recent, byName, popular };
}

function boardTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= MIN_TOKEN_LENGTH && !STOP_WORDS.has(t));
}

// Nguyên từ trong tên icon: "book" khớp "book-open", không khớp "notebook".
function matchesName(e: IconCatalogEntry, tokens: string[]): boolean {
  const parts = e.n.split('-');
  return tokens.some((t) => parts.includes(t));
}

// Tag bắt đầu bằng từ đó: "travel" khớp tag "travelling".
function matchesTag(e: IconCatalogEntry, tokens: string[]): boolean {
  return tokens.some((t) => e.t.some((tag) => tag.startsWith(t)));
}
