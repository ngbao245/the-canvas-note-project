import { X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useEscapeLayer } from '@/lib/shortcuts';
import { FOCUS_RING } from '@/lib/focus-ring';
import { useDemoStore } from './demo-store';

// Ô được trích trong bảng 4 x 4 của trang vẽ tay (hàng 2, cột 2, đếm từ 0).
const CELL_ROW = 2;
const CELL_COL = 2;
const TABLE = { x: 30, y: 150, w: 200, h: 120, rows: 4, cols: 4 };

/**
 * Panel xem nguồn của trích dẫn: trang tài liệu vẽ tay, ô được trích tô vàng + khoanh đỏ.
 * Hình tĩnh, không có PDF thật. Esc đóng (lớp overlay chạy trước lớp phím của demo,
 * nên Esc đầu tiên chỉ đóng panel, chưa nhả khung).
 */
export function SourcePanel() {
  const { t } = useI18n();
  const openId = useDemoStore((s) => s.sourceOpenId);
  const obj = useDemoStore((s) => s.objects.find((o) => o.id === s.sourceOpenId));
  const close = () => useDemoStore.getState().openSource(null);
  useEscapeLayer(close, { enabled: openId !== null });

  if (!obj?.source) return null;
  const { file, page, table } = obj.source;
  const cw = TABLE.w / TABLE.cols;
  const ch = TABLE.h / TABLE.rows;
  const cell = { x: TABLE.x + CELL_COL * cw, y: TABLE.y + CELL_ROW * ch };

  return (
    <aside
      aria-label={t('LANDING.DEMO.SOURCE_PANEL_TITLE')}
      className="absolute inset-y-0 right-0 z-toolbar flex w-72 select-none flex-col border-l border-border bg-card shadow-elevation-2"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="mr-auto min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{file}</p>
          <p className="text-xs text-muted-foreground">
            {t('LANDING.DEMO.SOURCE_LOCATION', { page, table })}
          </p>
        </div>
        <button
          type="button"
          aria-label={t('LANDING.DEMO.SOURCE_CLOSE')}
          title={t('LANDING.DEMO.SOURCE_CLOSE')}
          onClick={close}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-normal ease-standard hover:bg-muted ${FOCUS_RING}`}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <svg
          viewBox="0 0 260 340"
          role="img"
          aria-label={t('LANDING.DEMO.SOURCE_FIGURE', { file, page, table })}
          className="w-full"
        >
          <path
            d="M10 10 H220 L250 40 V330 H10 Z M220 10 V40 H250"
            fill="var(--background)"
            stroke="var(--muted-foreground)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {[50, 66, 82, 98, 114].map((y, i) => (
            <path
              key={y}
              d={`M30 ${y} H${i % 2 ? 200 : 228}`}
              stroke="var(--border-strong)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
          <rect x={cell.x} y={cell.y} width={cw} height={ch} fill="var(--warning)" opacity="0.45" />
          <rect
            x={TABLE.x}
            y={TABLE.y}
            width={TABLE.w}
            height={TABLE.h}
            fill="none"
            stroke="var(--muted-foreground)"
            strokeWidth="1.5"
          />
          {Array.from({ length: TABLE.cols - 1 }, (_, i) => (
            <path
              key={`c${i}`}
              d={`M${TABLE.x + (i + 1) * cw} ${TABLE.y} V${TABLE.y + TABLE.h}`}
              stroke="var(--muted-foreground)"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: TABLE.rows - 1 }, (_, i) => (
            <path
              key={`r${i}`}
              d={`M${TABLE.x} ${TABLE.y + (i + 1) * ch} H${TABLE.x + TABLE.w}`}
              stroke="var(--muted-foreground)"
              strokeWidth="1"
            />
          ))}
          <ellipse
            cx={cell.x + cw / 2}
            cy={cell.y + ch / 2}
            rx={cw * 0.75}
            ry={ch * 0.85}
            fill="none"
            stroke="var(--destructive)"
            strokeWidth="2"
          />
          <text x={TABLE.x} y={TABLE.y - 10} fontSize="12" fill="var(--foreground)">
            {t('LANDING.DEMO.TABLE_LABEL', { table })}
          </text>
          {[296, 312].map((y) => (
            <path key={y} d={`M30 ${y} H190`} stroke="var(--border-strong)" strokeWidth="2" strokeLinecap="round" />
          ))}
        </svg>
        <p className="mt-3 text-sm text-foreground">{obj.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('LANDING.DEMO.SOURCE_HINT')}</p>
      </div>
    </aside>
  );
}
