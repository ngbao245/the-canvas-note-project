import type { Config } from 'tailwindcss';

/*
 * Tailwind đọc token HEX từ src/styles/index.css qua var().
 * Token dạng HEX/rgba nên KHÔNG dùng <alpha-value>; màu cần opacity đã có biến *-soft riêng.
 * Thêm theme mới chỉ cần thêm khối [data-theme] trong index.css, không phải sửa file này.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'subtle-foreground': 'var(--subtle-foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
          hover: 'var(--primary-hover)',
          soft: 'var(--primary-soft)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
          elevated: 'var(--card-elevated)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
          soft: 'var(--destructive-soft)',
        },
        success: {
          DEFAULT: 'var(--success)',
          foreground: 'var(--success-foreground)',
          soft: 'var(--success-soft)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          foreground: 'var(--warning-foreground)',
          soft: 'var(--warning-soft)',
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
      },
      transitionTimingFunction: {
        standard: 'var(--easing-standard)',
      },
      transitionDuration: {
        fast: '60ms',
        normal: '200ms',
      },
    },
  },
  plugins: [],
};

export default config;
