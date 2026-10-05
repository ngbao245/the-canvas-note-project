import { useEffect, useRef } from 'react';
import {
  Bell,
  Database,
  Grid3x3,
  Keyboard,
  Languages,
  Palette,
  PanelLeft,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { useSettingsModalStore, type SettingsSection } from '@/stores/settings-modal-store';
import { Row, Section, SoonBadge } from './SettingsBlocks';
import { AppearanceSection } from './sections/AppearanceSection';
import { CanvasSection } from './sections/CanvasSection';
import { ShortcutsSection } from './sections/ShortcutsSection';
import { DataSection } from './sections/DataSection';
import { NotificationsSection } from './sections/NotificationsSection';
import { LocalizationSection } from './sections/LocalizationSection';
import { useI18n, type MessageKey } from '@/lib/i18n';

/**
 * SettingsModal — modal Cài đặt phủ toàn màn hình (Milanote /account/settings mở
 * dạng popup, bố cục theo mockups/10-settings.html: nav trái + nội dung phải).
 *
 * Mount 1 lần ở App, mở/đóng qua useSettingsModalStore → route nào cũng mở được.
 * Nội dung từng mục ở `sections/`, khối dựng dùng chung ở `SettingsBlocks.tsx`.
 *
 * Khi mở: chặn mọi phím xuống tầng dưới (capture + stopPropagation trên window)
 * để Ctrl+Z / Delete / F của canvas không chạy ngầm sau modal. Chỉ preventDefault
 * cho Tab ở 2 đầu (giữ focus trong modal); Space, Enter vẫn hoạt động bình thường.
 */

/**
 * Danh sách mục (thứ tự = thứ tự menu trái). description hiện dưới tiêu đề mục.
 * Mục chưa có nội dung hiện EmptyState "Sắp có" (xem PlaceholderSection).
 * Thêm mục mới: thêm vào union SettingsSection + 1 dòng ở đây + case trong SettingsContent.
 */
// Lưu KEY dịch, không lưu chữ: hằng số ngoài component chạy 1 lần lúc tải file,
// lưu chữ thì đổi ngôn ngữ không cập nhật. Dịch lúc render trong SettingsNav / SettingsContent.
const SECTIONS: {
  id: SettingsSection;
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  icon: LucideIcon;
}[] = [
  {
    id: 'account',
    labelKey: 'SETTINGS.ACCOUNT.TITLE',
    descriptionKey: 'SETTINGS.ACCOUNT.DESCRIPTION',
    icon: User,
  },
  {
    id: 'notifications',
    labelKey: 'SETTINGS.NOTIFICATIONS.TITLE',
    descriptionKey: 'SETTINGS.NOTIFICATIONS.DESCRIPTION',
    icon: Bell,
  },
  {
    id: 'appearance',
    labelKey: 'SETTINGS.APPEARANCE.TITLE',
    descriptionKey: 'SETTINGS.APPEARANCE.DESCRIPTION',
    icon: Palette,
  },
  {
    id: 'localization',
    labelKey: 'SETTINGS.LOCALIZATION.TITLE',
    descriptionKey: 'SETTINGS.LOCALIZATION.DESCRIPTION',
    icon: Languages,
  },
  {
    id: 'toolbar',
    labelKey: 'SETTINGS.TOOLBAR.TITLE',
    descriptionKey: 'SETTINGS.TOOLBAR.DESCRIPTION',
    icon: PanelLeft,
  },
  {
    id: 'canvas',
    labelKey: 'SETTINGS.CANVAS.TITLE',
    descriptionKey: 'SETTINGS.CANVAS.DESCRIPTION',
    icon: Grid3x3,
  },
  {
    id: 'shortcuts',
    labelKey: 'SETTINGS.SHORTCUTS.TITLE',
    descriptionKey: 'SETTINGS.SHORTCUTS.DESCRIPTION',
    icon: Keyboard,
  },
  {
    id: 'data',
    labelKey: 'SETTINGS.DATA.TITLE',
    descriptionKey: 'SETTINGS.DATA.DESCRIPTION',
    icon: Database,
  },
];

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function SettingsModal() {
  const open = useSettingsModalStore((s) => s.open);
  const close = useSettingsModalStore((s) => s.close);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    // Nhớ chỗ focus cũ (nút Cài đặt / avatar) để trả lại khi đóng.
    const prevFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key === 'Tab') trapTab(e, dialogRef.current);
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      prevFocus?.focus();
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-modal flex flex-col bg-background text-foreground"
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
        <h1 id="settings-title" className="text-base font-semibold">
          {t('SETTINGS.TITLE')}
        </h1>
        <button
          ref={closeBtnRef}
          type="button"
          onClick={close}
          title={t('SETTINGS.CLOSE_TITLE')}
          aria-label={t('SETTINGS.CLOSE')}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <SettingsBody />
    </div>
  );
}

/**
 * Giữ Tab trong modal: ở phần tử cuối Tab → về đầu, ở đầu Shift+Tab → về cuối.
 * Focus đang ngoài modal (hiếm, VD vừa bấm chuột ra nền) → kéo về trong.
 */
function trapTab(e: KeyboardEvent, root: HTMLElement | null): void {
  if (!root) return;
  const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  const outside = !(active instanceof Node) || !root.contains(active);
  if (e.shiftKey && (outside || active === first)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (outside || active === last)) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * Vùng cuộn + khối căn giữa (menu trái | nội dung phải).
 *
 * Chống co dãn khi chuyển mục (3 chỗ):
 *   - scrollbar-gutter: stable → luôn chừa chỗ thanh cuộn, mục dài/ngắn cùng bề rộng,
 *     khối căn giữa không nhích ngang.
 *   - w-full max-w-4xl → khối luôn rộng bằng nhau, không theo độ dài nội dung.
 *   - cột nội dung minmax(0,1fr) → chữ/ô dài không đẩy cột rộng ra.
 * Chuyển mục thì cuộn về đầu bằng scrollTop (không remount, giữ focus nút menu).
 */
function SettingsBody() {
  const section = useSettingsModalStore((s) => s.section);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [section]);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-7 px-6 py-8 md:grid-cols-[200px_minmax(0,1fr)]">
        <SettingsNav />
        <div className="min-w-0">
          <SettingsContent />
        </div>
      </div>
    </div>
  );
}

function SettingsNav() {
  const section = useSettingsModalStore((s) => s.section);
  const setSection = useSettingsModalStore((s) => s.setSection);
  const { t } = useI18n();
  return (
    <nav
      aria-label={t('SETTINGS.NAV')}
      className="flex gap-1 md:sticky md:top-0 md:flex-col md:self-start"
    >
      {SECTIONS.map(({ id, labelKey, icon: Icon }) => {
        const active = id === section;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            aria-current={active ? 'page' : undefined}
            // Cùng font-medium cho mọi mục: mục chọn chỉ đổi màu, không đậm hơn → chữ không rộng ra.
            className={`flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active
                ? 'bg-primary-soft text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </button>
        );
      })}
    </nav>
  );
}

function SettingsContent() {
  const section = useSettingsModalStore((s) => s.section);
  const { t } = useI18n();
  const meta = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];
  const props = { title: t(meta.labelKey), description: t(meta.descriptionKey) };
  switch (section) {
    case 'account':
      return <AccountSection {...props} />;
    case 'notifications':
      return <NotificationsSection {...props} />;
    case 'appearance':
      return <AppearanceSection {...props} />;
    case 'localization':
      return <LocalizationSection {...props} />;
    case 'canvas':
      return <CanvasSection {...props} />;
    case 'shortcuts':
      return <ShortcutsSection {...props} />;
    case 'data':
      return <DataSection {...props} />;
    default:
      return <PlaceholderSection {...props} icon={meta.icon} />;
  }
}

function AccountSection({ title, description }: { title: string; description: string }) {
  const { t } = useI18n();
  return (
    <Section title={title} description={description}>
      <Row
        title={t('SETTINGS.ACCOUNT.STATUS.TITLE')}
        description={t('SETTINGS.ACCOUNT.STATUS.DESCRIPTION')}
      >
        <SoonBadge>{t('SETTINGS.ACCOUNT.STATUS.GUEST')}</SoonBadge>
      </Row>
    </Section>
  );
}

/** Vỏ cho mục chưa làm: tiêu đề + mô tả + EmptyState "Sắp có". */
function PlaceholderSection({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  const { t } = useI18n();
  return (
    <Section title={title} description={description}>
      <div className="rounded-lg border border-dashed border-border">
        <EmptyState
          icon={icon}
          title={t('COMMON.COMING_SOON')}
          description={t('SETTINGS.COMING_SOON_DESCRIPTION')}
          compact
        />
      </div>
    </Section>
  );
}
