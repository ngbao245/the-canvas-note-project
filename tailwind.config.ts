import type { Config } from 'tailwindcss';

/*
 * Tailwind đọc token HEX từ src/styles/index.css qua var().
 * Token là HEX nên Tailwind không tự pha độ mờ: bọc bằng `color-mix` + `<alpha-value>`
 * để `bg-primary/15`, `border-success/40`... sinh ra CSS thật (trước 2026-10-13 các class
 * này bị bỏ im lặng). Không có `/xx` thì <alpha-value> = 1 → đúng màu gốc.
 * Thêm theme mới chỉ cần thêm khối [data-theme] trong index.css, không phải sửa file này.
 */
const token = (name: string) =>
  `color-mix(in srgb, var(--${name}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      // Vòng sáng lan ra quanh nhãn "đang sửa ở tab khác" (Milanote ElementUserTag `pulse`).
      keyframes: {
        'presence-pulse': {
          '0%': { boxShadow: '0 0 0 0 color-mix(in srgb, var(--warning) 80%, transparent)' },
          '100%': { boxShadow: '0 0 0 16px transparent' },
        },
      },
      animation: {
        'presence-pulse': 'presence-pulse 1.5s var(--easing-standard) infinite',
      },
      colors: {
        border: token('border'),
        'border-strong': token('border-strong'),
        input: token('input'),
        ring: token('ring'),
        background: token('background'),
        foreground: token('foreground'),
        'subtle-foreground': token('subtle-foreground'),
        primary: {
          DEFAULT: token('primary'),
          foreground: token('primary-foreground'),
          hover: token('primary-hover'),
          soft: token('primary-soft'),
        },
        card: {
          DEFAULT: token('card'),
          foreground: token('card-foreground'),
          elevated: token('card-elevated'),
        },
        popover: {
          DEFAULT: token('popover'),
          foreground: token('popover-foreground'),
        },
        muted: {
          DEFAULT: token('muted'),
          foreground: token('muted-foreground'),
        },
        destructive: {
          DEFAULT: token('destructive'),
          foreground: token('destructive-foreground'),
          soft: token('destructive-soft'),
        },
        success: {
          DEFAULT: token('success'),
          foreground: token('success-foreground'),
          soft: token('success-soft'),
        },
        warning: {
          DEFAULT: token('warning'),
          foreground: token('warning-foreground'),
          soft: token('warning-soft'),
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        DEFAULT: 'var(--shadow)',
        soft: 'var(--shadow-soft)',
        // Elevation scale — 1 idle, 2 hover, 3 dragging (xem index.css).
        'elevation-1': 'var(--shadow-elevation-1)',
        'elevation-2': 'var(--shadow-elevation-2)',
        'elevation-3': 'var(--shadow-elevation-3)',
      },
      zIndex: {
        canvas: 'var(--z-canvas)',
        'canvas-object': 'var(--z-canvas-object)',
        'canvas-selection': 'var(--z-canvas-selection)',
        'canvas-drag-preview': 'var(--z-canvas-drag-preview)',
        toolbar: 'var(--z-toolbar)',
        header: 'var(--z-header)',
        'drag-layer': 'var(--z-drag-layer)',
        modal: 'var(--z-modal)',
        tooltip: 'var(--z-tooltip)',
        dev: 'var(--z-dev)',
      },
      fontFamily: {
        serif: [
          'Fraunces',
          'Georgia',
          'Times New Roman',
          'serif',
        ],
      },
      transitionTimingFunction: {
        standard: 'var(--easing-standard)',
      },
      // Trỏ vào token trong index.css: đổi thời gian ở 1 chỗ, class + CSS thuần cùng theo.
      transitionDuration: {
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
      },
    },
  },
  plugins: [],
};

export default config;
