import { useEffect, useSyncExternalStore, type ComponentType } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LOCALES, useLocaleStore } from '@/lib/i18n';
import { useKeyboardPlatform } from '@/lib/shortcuts';
import { FOCUS_RING } from '@/lib/focus-ring';
import { useKeyboardPlatformStore, type KeyboardPlatform } from '@/stores/keyboard-platform-store';
import { useDevPanelStore } from './dev-panel-store';
import { DevSection, DevSegmented } from './DevControls';
import { WriteQueueSection } from './WriteQueueSection';
import { OutboxSection } from './OutboxSection';
import {
  ensureWriteMetrics,
  getRunningSession,
  getWriteMetricsVersion,
  subscribeWriteMetrics,
} from './write-metrics';

/**
 * Bảng công cụ dev (`docs/system/01-core.md`, spec cũ `docs/legacy/specs/dev-panel/`). CHỈ dev: App.tsx lazy-load sau cờ
 * import.meta.env.DEV, bản build không chứa file này. Luôn hiện, thu gọn được thành 1 thanh.
 * Chữ là mã công cụ dev, cố ý không qua bộ dịch.
 *
 * Thêm thứ cần test: thêm 1 phần tử vào SECTIONS, không sửa khung bảng.
 */

const SECTIONS: ReadonlyArray<{ id: string; title: string; Component: ComponentType }> = [
  { id: 'write-queue', title: 'Đo ghi máy + gửi server', Component: WriteQueueSection },
  { id: 'outbox', title: 'Server giả + outbox', Component: OutboxSection },
];

const PLATFORMS: ReadonlyArray<{ value: KeyboardPlatform; label: string }> = [
  { value: 'windows-linux', label: 'win' },
  { value: 'macos', label: 'mac' },
];

const LOCALE_OPTIONS = LOCALES.map((code) => ({ value: code, label: code }));

export default function DevPanel() {
  useEffect(() => {
    ensureWriteMetrics();
  }, []);

  const collapsed = useDevPanelStore((s) => s.collapsed);
  const setCollapsed = useDevPanelStore((s) => s.setCollapsed);
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  // Tô theo platform đang dùng (kể cả khi Cài đặt để Tự động). Bấm = chọn cố định kiểu đó.
  const platform = useKeyboardPlatform();
  const setPlatformPref = useKeyboardPlatformStore((s) => s.setPref);
  useSyncExternalStore(subscribeWriteMetrics, getWriteMetricsVersion);
  const recording = getRunningSession() !== null;

  return (
    <div
      aria-label="Dev panel"
      role="region"
      className="fixed bottom-3 right-6 z-dev flex max-h-[75vh] w-[340px] select-none flex-col overflow-hidden rounded-lg border border-border bg-popover/95 text-popover-foreground shadow-lg backdrop-blur"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">dev</span>
        <DevSegmented
          label="Dev keyboard platform"
          options={PLATFORMS}
          value={platform}
          onChange={setPlatformPref}
        />
        <DevSegmented label="Dev locale" options={LOCALE_OPTIONS} value={locale} onChange={setLocale} />
        {recording && (
          <span className="flex items-center gap-1 text-[10px] text-destructive">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-destructive" />
            rec
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand dev panel' : 'Collapse dev panel'}
          aria-expanded={!collapsed}
          className={`ml-auto rounded-md p-1 text-muted-foreground transition-colors duration-normal hover:bg-muted hover:text-foreground ${FOCUS_RING}`}
        >
          {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
      {!collapsed && (
        <div className="overflow-y-auto border-t border-border">
          {SECTIONS.map(({ id, title, Component }) => (
            <DevSection key={id} title={title}>
              <Component />
            </DevSection>
          ))}
        </div>
      )}
    </div>
  );
}
