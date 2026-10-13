import { useDemoStore } from './demo-store';
import { SAMPLE_LINKS } from './sample-board';
import type { DemoObject } from './types';

/**
 * Đường nối tĩnh giữa các object, vẽ trong toạ độ board (nằm dưới object).
 * Nối từ cạnh của `from` sang cạnh đối diện của `to`. Thiếu 1 đầu (đã xoá) thì ẩn,
 * undo lại là hiện lại vì đường chỉ tính từ object đang có.
 */
export function DemoLinks() {
  const objects = useDemoStore((s) => s.objects);
  const byId = new Map(objects.map((o) => [o.id, o]));

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      width={1}
      height={1}
      aria-hidden="true"
    >
      <defs>
        <marker
          id="demo-link-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M1 1 L9 5 L1 9" fill="none" stroke="var(--primary)" strokeWidth="1.6" />
        </marker>
      </defs>
      {SAMPLE_LINKS.map((link) => {
        const a = byId.get(link.from);
        const b = byId.get(link.to);
        if (!a || !b) return null;
        return (
          <path
            key={link.id}
            d={linkPath(a, b)}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={2}
            strokeDasharray="6 6"
            strokeLinecap="round"
            markerEnd="url(#demo-link-arrow)"
          />
        );
      })}
    </svg>
  );
}

function linkPath(a: DemoObject, b: DemoObject): string {
  const aCx = a.x + a.w / 2;
  const bCx = b.x + b.w / 2;
  const aCy = a.y + a.h / 2;
  const bCy = b.y + b.h / 2;
  // b nằm bên phải a → ra từ cạnh phải a, vào cạnh trái b; ngược lại thì đảo.
  const toRight = bCx >= aCx;
  const x1 = toRight ? a.x + a.w : a.x;
  const x2 = toRight ? b.x : b.x + b.w;
  const bend = Math.max(40, Math.abs(x2 - x1) / 2);
  const c1 = toRight ? x1 + bend : x1 - bend;
  const c2 = toRight ? x2 - bend : x2 + bend;
  return `M ${x1} ${aCy} C ${c1} ${aCy}, ${c2} ${bCy}, ${x2} ${bCy}`;
}
