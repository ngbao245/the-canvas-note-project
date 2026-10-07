import type { CSSProperties } from 'react';

/**
 * Style cho khối layout ở cỡ gốc rồi scale theo Kích thước giao diện (toolbar trái, panel Unsort).
 * Cao = 100% / tỉ lệ → sau khi scale vẫn cao bằng khung cha.
 * Dùng transform (không zoom) để khối không đổi chỗ chiếm trong layout của canvas.
 */
export function scaledFillStyle(scale: number): CSSProperties {
  return {
    height: `${100 / scale}%`,
    transform: `scale(${scale})`,
    transformOrigin: '0 0',
  };
}
