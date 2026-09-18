/**
 * TileIcon — SVG paper + line style cho toolbar palette (mockup 04-canvas.html).
 * Paper fill dùng var(--card) để follow theme (dark = card đậm, light = trắng).
 * Line dùng var(--muted-foreground). Board dùng var(--primary).
 *
 * Tách khỏi Toolbar.tsx để file toolbar chỉ còn layout + drag logic.
 */

export type TileType =
  | 'note'
  | 'link'
  | 'image'
  | 'todo'
  | 'board'
  | 'table'
  | 'file'
  | 'line';

export function TileIcon({ type }: { type: TileType }) {
  const paper = 'var(--card)';
  const line = 'var(--muted-foreground)';
  // Icon 32px width theo mockup 04 comp-tile (.el-icon svg width: 32px).
  const style: React.CSSProperties = {
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.16))',
    width: '32px',
    height: 'auto',
  };

  switch (type) {
    case 'note':
      return (
        <svg viewBox="0 0 32 24" style={style}>
          <rect fill={paper} width="32" height="24" rx="3" />
          <path
            fill={line}
            d="M5.75 5h20.5a.75.75 0 1 1 0 1.5H5.75a.75.75 0 0 1 0-1.5zm0 5h20.5a.75.75 0 1 1 0 1.5H5.75a.75.75 0 1 1 0-1.5zm0 5h18.1a.75.75 0 1 1 0 1.5H5.75a.75.75 0 1 1 0-1.5z"
          />
        </svg>
      );
    case 'link':
      return (
        <svg viewBox="0 0 32 24" style={style}>
          <rect fill={paper} width="32" height="24" rx="3" />
          <path
            fill={line}
            fillRule="nonzero"
            d="M17.986 10.014a4.285 4.285 0 0 1 0 6.06l-1.67 1.67a4.285 4.285 0 0 1-6.06-6.06.741.741 0 0 1 1.048 1.05 2.802 2.802 0 0 0 3.963 3.962l1.67-1.67a2.802 2.802 0 0 0 0-3.964.741.741 0 1 1 1.049-1.048zm3.759-3.759a4.285 4.285 0 0 1 0 6.06.741.741 0 0 1-1.049-1.048 2.802 2.802 0 0 0-3.963-3.963l-1.67 1.67a2.802 2.802 0 0 0 0 3.964.741.741 0 1 1-1.049 1.048 4.285 4.285 0 0 1 0-6.06l1.67-1.67a4.285 4.285 0 0 1 6.06 0z"
          />
        </svg>
      );
    case 'image':
      return (
        <svg viewBox="0 0 32 24" style={style}>
          <rect fill={paper} width="32" height="24" rx="3" />
          <circle fill={line} cx="10" cy="9" r="2.5" />
          <path fill={line} d="M4 20l6-6 4 3 5-5 9 8H4z" />
        </svg>
      );
    case 'todo':
      return (
        <svg viewBox="0 0 32 24" style={style}>
          <rect fill={paper} width="32" height="24" rx="3" />
          <path
            fill={line}
            d="M6.28 7.77a.75.75 0 0 0-1.06 1.06l1.5 1.5a.75.75 0 0 0 1.06 0l3-3a.75.75 0 0 0-1.06-1.06L7.25 8.74l-.97-.97zm0 6.5a.75.75 0 0 0-1.06 1.06l1.5 1.5a.75.75 0 0 0 1.06 0l3-3a.75.75 0 0 0-1.06-1.06l-2.47 2.47-.97-.97zM14.75 8h11.3a.75.75 0 1 1 0 1.5h-11.3a.75.75 0 1 1 0-1.5zm0 6.4h11.3a.75.75 0 1 1 0 1.5h-11.3a.75.75 0 1 1 0-1.5z"
          />
        </svg>
      );
    case 'board':
      return (
        <svg viewBox="0 0 32 32" style={{ ...style, width: '28px' }}>
          <rect fill="var(--primary)" width="32" height="32" rx="8" />
          <rect width="7" height="7" x="8" y="8" fill="#fff" rx="2" />
          <rect width="7" height="7" x="8" y="17" fill="#fff" fillOpacity="0.75" rx="2" />
          <rect width="7" height="7" x="17" y="8" fill="#fff" fillOpacity="0.35" rx="3.5" />
          <rect width="7" height="7" x="17" y="17" fill="#fff" fillOpacity="0.55" rx="2" />
        </svg>
      );
    case 'table':
      return (
        <svg viewBox="0 0 32 24" style={style}>
          <rect fill={paper} width="32" height="24" rx="3" />
          <path
            stroke={line}
            fill="none"
            strokeWidth="1.5"
            d="M4 6h9M4 10h9M4 14h7M18 6h10M18 10h10M18 14h8"
          />
        </svg>
      );
    case 'file':
      return (
        <svg viewBox="0 0 32 24" style={style}>
          <path
            fill={paper}
            d="M6 1h13l7 7v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z"
          />
          <path fill={line} opacity="0.4" d="M19 1v6a1 1 0 0 0 1 1h6" />
          <path
            fill={line}
            d="M9 13h11a.6.6 0 1 1 0 1.2H9A.6.6 0 1 1 9 13zm0 4h11a.6.6 0 1 1 0 1.2H9A.6.6 0 1 1 9 17z"
          />
        </svg>
      );
    case 'line':
      return (
        <svg viewBox="0 0 32 28" style={style}>
          <path
            fill={line}
            fillRule="evenodd"
            d="m30.385 0-3 8-1.793-1.793-21.5 21.5a1 1 0 0 1-1.32.083l-.094-.083a1 1 0 0 1 0-1.414L24.177 4.792 22.385 3l8-3z"
          />
        </svg>
      );
  }
}
