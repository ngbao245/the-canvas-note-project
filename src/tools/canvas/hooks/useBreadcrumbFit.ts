import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Rút gọn breadcrumb theo bề rộng thật (Milanote parity): màn hình rộng hiện
 * nhiều cấp, hẹp thì ẩn bớt cấp giữa thành nút "...".
 *
 * Cách đo: component render 1 lớp đo ẩn (`measureRef`) chứa đủ mọi mục ở bề
 * rộng tự nhiên. Mục đánh dấu `data-crumb-measure`, nút "..." đánh dấu
 * `data-crumb-ellipsis`. Hook so tổng bề rộng với khung thật (`containerRef`).
 * ResizeObserver trên cả 2 → đổi cỡ cửa sổ, đổi tên, font tải xong đều tính lại.
 *
 * `key` đổi khi chuỗi board đổi (id + tên) để đo lại từ đầu.
 */
export function useBreadcrumbFit(key: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(0);

  // useLayoutEffect: tính trước khi paint → không nháy bản đầy đủ rồi mới rút.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const recompute = () => {
      const items = measure.querySelectorAll<HTMLElement>('[data-crumb-measure]');
      const widths = Array.from(items, (el) => el.getBoundingClientRect().width);
      const ellipsis = measure.querySelector<HTMLElement>('[data-crumb-ellipsis]');
      const ellipsisWidth = ellipsis?.getBoundingClientRect().width ?? 0;
      setHidden(computeHiddenCount(container.clientWidth, widths, ellipsisWidth));
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    ro.observe(measure);
    return () => ro.disconnect();
  }, [key]);

  return { containerRef, measureRef, hidden };
}

/**
 * Số cấp giữa cần ẩn (tính từ cấp ngay sau Home). Luôn giữ Home (index 0) và
 * mục hiện tại (cuối). Ẩn dần từ gần Home → cấp cha gần nhất giữ lâu nhất.
 * Ẩn hết cấp giữa mà vẫn thiếu chỗ → trả n-2, mục hiện tại tự cắt "…" bằng CSS.
 *
 * `widths[i]` đã gồm dấu ngăn đứng trước mục i (i > 0). `ellipsisWidth` gồm dấu
 * ngăn của chính nút "...". Pure.
 */
export function computeHiddenCount(
  available: number,
  widths: number[],
  ellipsisWidth: number,
): number {
  const n = widths.length;
  if (n <= 2) return 0;
  const total = widths.reduce((a, b) => a + b, 0);
  if (total <= available) return 0;

  let visible = total + ellipsisWidth;
  for (let k = 1; k <= n - 2; k++) {
    visible -= widths[k];
    if (visible <= available) return k;
  }
  return n - 2;
}
