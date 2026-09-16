import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import {
  DrawablyButton,
  DrawablyCard,
  DrawablyBadge,
  DrawablyList,
  DrawablyUnderline,
  DrawablyHighlight,
  DrawablyDivider,
} from 'drawably/react';
import 'drawably/style.css';

/**
 * Trang thử nghiệm: landing page dựng bằng thư viện drawably (phong cách vẽ tay).
 * Đây KHÔNG phải landing chính thức. Mục đích: xem phong cách hand-drawn có hợp bibo không.
 * Route: /thu/drawably-landing
 *
 * Theme drawably qua CSS variable:
 *   --drawably-stroke: màu nét, --drawably-fill: màu tô, --drawably-paper: nền, --drawably-width: độ dày nét
 *
 * Trang tự set data-theme trên <html> khi mount, trả lại theme cũ khi rời (thử nghiệm, không đụng app).
 */
export default function LandingDraw() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.getAttribute('data-theme');
    html.setAttribute('data-theme', theme);
    return () => {
      if (prev) html.setAttribute('data-theme', prev);
      else html.removeAttribute('data-theme');
    };
  }, [theme]);

  const isDark = theme === 'dark';
  const mutedColor = isDark ? '#a3a099' : '#6b6862';

  return (
    <main
      className="relative min-h-screen"
      style={
        {
          // Nền + chữ set cục bộ cho trang thử (không đụng token app).
          // Dark: tông giấy tối trung tính hơi ấm, hợp phong cách "mực trên giấy".
          background: isDark ? '#1a1b1e' : '#faf9f6',
          color: isDark ? '#e7e5e1' : '#1f1e1c',
          // Nét mực: dark dùng xanh sáng hơn cho nổi; light dùng xanh mockup.
          '--drawably-stroke': isDark ? '#5cb0e6' : '#007acc',
          '--drawably-fill': isDark ? '#5cb0e6' : '#007acc',
          // Giấy dưới nét (nền các control vẽ tay) khớp nền trang.
          '--drawably-paper': isDark ? '#1a1b1e' : '#faf9f6',
          '--drawably-width': '2',
        } as React.CSSProperties
      }
    >
      {/* Nút đổi theme để so sánh dark/light */}
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-lg border transition-colors"
        style={{
          borderColor: isDark ? '#33343a' : '#e2e0da',
          background: isDark ? '#232428' : '#ffffff',
          color: mutedColor,
        }}
        aria-label="Đổi giao diện sáng/tối"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-16">
        {/* Hero */}
        <section className="flex flex-col items-center gap-5 text-center">
          <DrawablyBadge variant="scribble">bản thử · phong cách vẽ tay</DrawablyBadge>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Không gian làm việc trực quan{' '}
            <DrawablyHighlight>gom mọi thứ</DrawablyHighlight> về một chỗ
          </h1>
          <p className="max-w-2xl text-base" style={{ color: mutedColor }}>
            Gom nguồn, ghi chú, và sắp xếp trên một canvas kéo thả. Mọi dữ liệu đều{' '}
            <DrawablyUnderline>truy được về nguồn gốc</DrawablyUnderline>.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <DrawablyButton variant="solid">Bắt đầu ngay</DrawablyButton>
            <DrawablyButton tone="neutral">Xem tài liệu</DrawablyButton>
          </div>
        </section>

        <DrawablyDivider />

        {/* Feature cards */}
        <section className="grid gap-5 sm:grid-cols-3">
          <DrawablyCard>
            <div className="flex flex-col gap-2 p-4">
              <h3 className="text-lg font-semibold">Canvas trực quan</h3>
              <p className="text-sm" style={{ color: mutedColor }}>
                Kéo thả note, bảng, ảnh, file lên mặt phẳng vô hạn. Nối bằng connector.
              </p>
            </div>
          </DrawablyCard>
          <DrawablyCard>
            <div className="flex flex-col gap-2 p-4">
              <h3 className="text-lg font-semibold">Truy nguồn gốc</h3>
              <p className="text-sm" style={{ color: mutedColor }}>
                Mỗi object biết mình từ file nào, trang nào. Bấm một cái mở đúng đoạn nguồn.
              </p>
            </div>
          </DrawablyCard>
          <DrawablyCard>
            <div className="flex flex-col gap-2 p-4">
              <h3 className="text-lg font-semibold">AI hỗ trợ</h3>
              <p className="text-sm" style={{ color: mutedColor }}>
                Trích bảng, so sánh, phát hiện biến động ngay trên canvas.
              </p>
            </div>
          </DrawablyCard>
        </section>

        <DrawablyDivider />

        {/* Feature list */}
        <section className="mx-auto w-full max-w-xl">
          <h2 className="mb-4 text-center text-2xl font-bold">Có gì trong bibo</h2>
          <DrawablyList marker="check">
            <li>Workspace chứa nhiều canvas, note, nguồn</li>
            <li>Object nhiều loại: note, link, to-do, board, table, image, file</li>
            <li>Inspector xem chi tiết và độ tin cậy của object</li>
            <li>Khu Unsort cho tài liệu mới import chưa xếp</li>
          </DrawablyList>
        </section>
      </div>
    </main>
  );
}
