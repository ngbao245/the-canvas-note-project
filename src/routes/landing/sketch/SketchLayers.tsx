import type { ReactNode } from 'react';

/**
 * Vẽ 1 nhóm `<g>` theo kiểu nét chì 2 lượt: lớp chính + lớp phụ mờ lệch 1px.
 * `id` phải duy nhất trong trang (dùng làm đích cho `<use>`).
 */
export function SketchLayers({ id, children }: { id: string; children: ReactNode }) {
  return (
    <>
      <defs>
        <g
          id={id}
          fill="none"
          stroke="#2a2a2e"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {children}
        </g>
      </defs>
      <use href={`#${id}`} filter="url(#sk-rough-a)" />
      <use href={`#${id}`} filter="url(#sk-rough-b)" opacity="0.3" transform="translate(1.2 0.8)" />
    </>
  );
}
