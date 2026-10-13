import type { CSSProperties, ReactNode } from 'react';

/** Khung tranh dán băng keo, nghiêng nhẹ `tilt` độ. */
export function SketchFrame({ tilt, children }: { tilt: number; children: ReactNode }) {
  return (
    <div className="sk-frame" style={{ '--tilt': `${tilt}deg` } as CSSProperties}>
      {children}
    </div>
  );
}
