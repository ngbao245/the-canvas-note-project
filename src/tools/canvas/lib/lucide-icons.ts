// ============================================================
// Tra component lucide theo tên (spec canvas-board-icon).
// ============================================================
//
// Import cả namespace lucide-react → nặng (~200 KB). CHỈ được import từ file
// nạp bằng React.lazy (BoardIconPopup, LucideByName) để bộ icon nằm trong 1
// chunk dùng chung, tải 1 lần khi cần. Không import từ code chạy eager.
//
// Không tách từng icon bằng `import(\`lucide-react/.../${name}.js\`)`: Vite không
// phân tích được template import với đường dẫn package → bản build không có chunk.
// ============================================================

import * as LucideIcons from 'lucide-react';
import type { ComponentType } from 'react';

export interface LucideLikeProps {
  className?: string;
  style?: { color?: string };
  strokeWidth?: number;
}

// Namespace import là object module, ép qua unknown để tra theo chuỗi.
const ICON_MODULE = LucideIcons as unknown as Record<string, ComponentType<LucideLikeProps> | undefined>;

/** Tên kebab-case ('arrow-down-0-1') → PascalCase ('ArrowDown01'), khớp script sinh catalog. */
export function lucidePascalName(kebab: string): string {
  return kebab
    .split('-')
    .map((p) => (p.length === 0 ? '' : p[0].toUpperCase() + p.slice(1)))
    .join('');
}

/** Component theo tên PascalCase, không có → undefined. */
export function getLucideIcon(pascal: string): ComponentType<LucideLikeProps> | undefined {
  return ICON_MODULE[pascal];
}
