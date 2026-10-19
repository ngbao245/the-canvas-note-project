// ============================================================
// Vẽ icon board (spec canvas-board-icon) — dùng cho tile, nút toolbar, xem trước.
// ============================================================
//
// Icon chữ (kind 'text') render thẳng. Icon lucide nạp qua React.lazy
// (LucideByName) → bộ icon nằm trong chunk dùng chung với popup, chỉ tải khi có
// board gắn icon lucide hoặc mở popup. Chunk canvas chính không gánh bộ icon.
// ============================================================

import { lazy, memo, Suspense } from 'react';
import type { BoardIcon } from '../../types';

const LucideByName = lazy(() => import('./LucideByName'));

export const BoardIconGlyph = memo(function BoardIconGlyph({
  icon,
  color,
  iconClass = 'h-10 w-10',
  textClass = 'text-3xl font-semibold',
}: {
  icon: BoardIcon;
  color: string;
  iconClass?: string;
  textClass?: string;
}) {
  if (icon.kind === 'text') {
    return (
      <span className={`select-none leading-none ${textClass}`} style={{ color }} aria-hidden="true">
        {icon.value}
      </span>
    );
  }
  // Fallback rỗng: chunk icon tải nhanh, spinner trong ô 72px chỉ gây nháy.
  return (
    <Suspense fallback={null}>
      <LucideByName name={icon.value} className={iconClass} style={{ color }} strokeWidth={2} />
    </Suspense>
  );
});
