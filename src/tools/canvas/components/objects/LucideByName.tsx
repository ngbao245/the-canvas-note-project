import { getLucideIcon, lucidePascalName, type LucideLikeProps } from '../../lib/lucide-icons';

/**
 * Vẽ 1 icon lucide theo tên kebab-case. Nạp qua React.lazy từ BoardIconGlyph →
 * chung chunk bộ icon với popup chọn icon. Tên không còn trong lucide (nâng
 * version) → không vẽ gì.
 */
export default function LucideByName({ name, ...props }: LucideLikeProps & { name: string }) {
  const Comp = getLucideIcon(lucidePascalName(name));
  return Comp ? <Comp {...props} /> : null;
}
