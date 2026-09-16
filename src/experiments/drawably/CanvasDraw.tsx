import { useEffect, useRef, useState } from 'react';
import { Moon, Sun, MousePointer2, Move, Download, Trash2, Inbox } from 'lucide-react';
import {
  DrawablyCard,
  DrawablyBadge,
  DrawablyButton,
  DrawablyArrow,
  DrawablyDivider,
} from 'drawably/react';
import 'drawably/style.css';

/**
 * Trang thử nghiệm: canvas dựng bằng drawably (phong cách vẽ tay).
 * Bám sát mockup mockups/04-canvas.html: rail + sidebar palette + board + inspector.
 * Đây là bản XEM PHONG CÁCH tĩnh — không làm tương tác động (peek/stick, toggle layout, tools view).
 * Connector nối các card bằng DrawablyArrow.
 * Route: /thu/drawably-canvas
 */

const PALETTE = ['Note', 'Link', 'To-do', 'Board', 'Table', 'Image', 'File', 'Line'];

export default function CanvasDraw() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.getAttribute('data-theme');
    html.setAttribute('data-theme', theme);
    return () => {
      if (prev) html.setAttribute('data-theme', prev);
      else html.removeAttribute('data-theme');
    };
  }, [theme]);

  // Arrow đọc vị trí anchor sau khi layout xong; render thêm một nhịp cho chắc.
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const isDark = theme === 'dark';
  const mutedColor = isDark ? '#a3a099' : '#6b6862';
  const paper = isDark ? '#1a1b1e' : '#faf9f6';
  const ink = isDark ? '#5cb0e6' : '#007acc';
  const panelBg = isDark ? '#202125' : '#ffffff';
  const panelBorder = isDark ? '#33343a' : '#e2e0da';

  const docRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);
  const findingRef = useRef<HTMLDivElement>(null);

  const rootStyle = {
    background: paper,
    color: isDark ? '#e7e5e1' : '#1f1e1c',
    '--drawably-stroke': ink,
    '--drawably-fill': ink,
    '--drawably-paper': paper,
    '--drawably-width': '2',
  } as React.CSSProperties;

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={rootStyle}>
      {/* Rail 56px */}
      <div
        className="flex w-14 flex-col items-center gap-2 border-r py-3"
        style={{ borderColor: panelBorder, background: panelBg }}
      >
        <div
          className="mb-2 grid h-8 w-8 place-items-center rounded-lg text-xs font-bold"
          style={{ background: ink, color: '#fff' }}
        >
          b
        </div>
        {['C', 'N', 'S', 'P'].map((c) => (
          <div
            key={c}
            className="grid h-10 w-10 place-items-center rounded-lg text-sm"
            style={{ color: mutedColor }}
          >
            {c}
          </div>
        ))}
      </div>

      {/* Sidebar palette 232px */}
      <aside
        className="flex flex-col border-r"
        style={{ width: 232, borderColor: panelBorder, background: panelBg }}
      >
        <div className="flex-1 overflow-y-auto p-3">
          <div
            className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: mutedColor }}
          >
            Kéo vào canvas
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PALETTE.map((name) => (
              <div
                key={name}
                className="flex cursor-grab flex-col items-center gap-2 rounded-lg p-2.5"
              >
                <DrawablyCard>
                  <div className="grid h-8 w-10 place-items-center" />
                </DrawablyCard>
                <span className="text-[11px]" style={{ color: mutedColor }}>
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t p-2.5" style={{ borderColor: panelBorder }}>
          <DrawablyButton tone="neutral" className="w-full">
            <Trash2 className="mr-1 inline h-4 w-4" /> Thùng rác
          </DrawablyButton>
        </div>
      </aside>

      {/* Board */}
      <section
        className="relative flex-1 overflow-hidden"
        style={{
          backgroundColor: paper,
          backgroundImage: `radial-gradient(circle at 1px 1px, ${
            isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
          } 1px, transparent 0)`,
          backgroundSize: '26px 26px',
        }}
      >
        {/* Toolbar */}
        <div
          className="absolute left-3 top-3 z-10 flex gap-1 rounded-lg border p-1"
          style={{ borderColor: panelBorder, background: panelBg }}
        >
          <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs" style={{ color: isDark ? '#e7e5e1' : '#1f1e1c' }}>
            <MousePointer2 className="h-4 w-4" /> Chọn
          </button>
          <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs" style={{ color: mutedColor }}>
            <Move className="h-4 w-4" /> Pan
          </button>
          <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs" style={{ color: mutedColor }}>
            <Download className="h-4 w-4" /> Import
          </button>
        </div>

        {/* Unsort tab góc phải */}
        <button
          className="absolute right-0 top-0 z-10 flex items-center gap-2 rounded-bl-lg border-b border-l px-3 py-2 text-xs"
          style={{ borderColor: panelBorder, background: panelBg, color: mutedColor }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#f0b429' }} />
          <Inbox className="h-4 w-4" /> Unsort · 3
        </button>

        {/* Card nodes */}
        <div
          ref={docRef}
          className="absolute w-48"
          style={{ left: 24, top: 96 }}
        >
          <DrawablyCard>
            <div className="p-3">
              <div className="mb-2 flex items-center gap-2">
                <DrawablyBadge variant="scribble">PDF</DrawablyBadge>
                <span className="text-xs font-semibold">BCTC 2024</span>
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 w-full rounded" style={{ background: mutedColor, opacity: 0.3 }} />
                <div className="h-1.5 w-4/5 rounded" style={{ background: mutedColor, opacity: 0.3 }} />
                <div className="h-1.5 w-3/5 rounded" style={{ background: mutedColor, opacity: 0.3 }} />
              </div>
            </div>
          </DrawablyCard>
        </div>

        <div
          ref={tableRef}
          className="absolute w-64"
          style={{ left: 300, top: 110 }}
        >
          <DrawablyCard>
            <div className="p-3">
              <div className="mb-2 flex items-center gap-2">
                <DrawablyBadge>TABLE</DrawablyBadge>
                <span className="text-xs font-semibold">Kết quả kinh doanh</span>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ color: mutedColor }}>
                    <th className="text-left font-normal">Chỉ tiêu</th>
                    <th className="text-right font-normal">2023</th>
                    <th className="text-right font-normal">2024</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ color: mutedColor }}>Doanh thu</td>
                    <td className="text-right">120.000</td>
                    <td className="text-right">146.000</td>
                  </tr>
                  <tr>
                    <td style={{ color: mutedColor }}>LN gộp</td>
                    <td className="text-right">35.500</td>
                    <td className="text-right">42.100</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </DrawablyCard>
        </div>

        <div
          ref={compareRef}
          className="absolute w-72"
          style={{ left: 640, top: 110 }}
        >
          <DrawablyCard>
            <div className="p-3">
              <div className="mb-2 flex items-center gap-2">
                <DrawablyBadge>COMPARE</DrawablyBadge>
                <span className="text-xs font-semibold">So sánh 2023 → 2024</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span style={{ color: mutedColor }}>Doanh thu</span>
                  <span style={{ color: '#3f9142' }}>+21,7%</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: mutedColor }}>CP bán hàng</span>
                  <span style={{ color: '#f0b429' }}>+60,9%</span>
                </div>
              </div>
            </div>
          </DrawablyCard>
        </div>

        <div
          ref={findingRef}
          className="absolute w-72"
          style={{ left: 640, top: 320 }}
        >
          <DrawablyCard>
            <div className="p-3">
              <div className="mb-2 flex items-center gap-2">
                <DrawablyBadge variant="scribble">FINDING</DrawablyBadge>
                <span className="text-xs font-semibold">Biến động cần chú ý</span>
              </div>
              <p className="text-[12px] leading-relaxed">
                Chi phí bán hàng tăng{' '}
                <span style={{ color: '#f0b429', fontWeight: 700 }}>+60,9%</span> trong khi doanh
                thu chỉ tăng 21,7%.
              </p>
            </div>
          </DrawablyCard>
        </div>

        {/* Connector vẽ tay nối các card */}
        {ready && (
          <>
            <DrawablyArrow from={docRef} to={tableRef} />
            <DrawablyArrow from={tableRef} to={compareRef} />
            <DrawablyArrow from={compareRef} to={findingRef} />
          </>
        )}
      </section>

      {/* Inspector phải */}
      <aside
        className="flex w-72 flex-col gap-4 border-l p-4"
        style={{ borderColor: panelBorder, background: panelBg }}
      >
        <div>
          <div className="mb-1 flex items-center gap-2">
            <DrawablyBadge>TABLE</DrawablyBadge>
            <span className="text-sm font-semibold">Kết quả kinh doanh</span>
          </div>
          <div className="text-[11px]" style={{ color: mutedColor }}>
            Object trên Canvas · cập nhật 2 phút trước
          </div>
        </div>

        <DrawablyDivider />

        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: mutedColor }}>
            Nguồn gốc
          </div>
          <DrawablyCard>
            <div className="space-y-1.5 p-3 text-xs">
              <div className="flex justify-between">
                <span style={{ color: mutedColor }}>File</span>
                <span>BCTC 2024.pdf</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: mutedColor }}>Trang</span>
                <span>12</span>
              </div>
              <div className="pt-1">
                <DrawablyButton variant="solid" className="w-full">
                  Mở đúng đoạn nguồn
                </DrawablyButton>
              </div>
            </div>
          </DrawablyCard>
        </div>

        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: mutedColor }}>
            Độ tin cậy
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: mutedColor }}>
            <div className="h-1.5 flex-1 rounded-full" style={{ background: isDark ? '#33343a' : '#e2e0da' }}>
              <div className="h-full rounded-full" style={{ width: '94%', background: '#3f9142' }} />
            </div>
            94%
          </div>
        </div>
      </aside>

      {/* Toggle theme */}
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="absolute bottom-4 right-4 z-20 grid h-10 w-10 place-items-center rounded-lg border transition-colors"
        style={{ borderColor: panelBorder, background: panelBg, color: mutedColor }}
        aria-label="Đổi giao diện sáng/tối"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
    </div>
  );
}
