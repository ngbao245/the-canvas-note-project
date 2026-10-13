/**
 * Đọc giá trị token CSS (`:root` trong `src/styles/index.css`) lúc chạy.
 * Dùng cho API không nhận `var()`, VD Web Animations (`el.animate`). Nhờ vậy token
 * vẫn là nguồn chuẩn duy nhất, không phải chép giá trị sang TS.
 * `fallback` chỉ để an toàn khi CSS chưa nạp, không phải bản sao của token.
 */
export function readCssToken(name: `--${string}`, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}
