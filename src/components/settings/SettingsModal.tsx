import { useEffect, useRef } from 'react';
import {
  Bell,
  Database,
  Grid3x3,
  Languages,
  Palette,
  PanelLeft,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import { EmptyState, OverlayScroll } from '@/components/shared';
import { useSettingsModalStore, type SettingsSection } from '@/stores/settings-modal-store';
import { Row, Section, SoonBadge } from './SettingsBlocks';
import { AppearanceSection } from './sections/AppearanceSection';
import { CanvasSection } from './sections/CanvasSection';
import { DataSection } from './sections/DataSection';
import { NotificationsSection } from './sections/NotificationsSection';
import { LocalizationSection } from './sections/LocalizationSection';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { useInterfaceScale } from '@/stores/interface-store';
import { ESCAPE_COMBO, formatCombo, useKeyboardPlatform, useModalLayer } from '@/lib/shortcuts';

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
    id: 'data',
    labelKey: 'SETTINGS.DATA.TITLE',
    descriptionKey: 'SETTINGS.DATA.DESCRIPTION',
    icon: Database,
  },
];

export function SettingsModal() {
  const open = useSettingsModalStore((s) => s.open);
  const close = useSettingsModalStore((s) => s.close);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const uiScale = useInterfaceScale();
  const platform = useKeyboardPlatform();
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    // Nhớ chỗ focus cũ (nút Cài đặt / avatar) để trả lại khi đóng.
    const prevFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeBtnRef.current?.focus();

    return () => prevFocus?.focus();
  }, [open]);

  // Lớp overlay chặn: phím canvas (Ctrl+Z, Delete, F, 0) không chạy ngầm sau modal.
  // Phím toàn app (Ctrl+Shift+D...) vẫn chạy vì lớp global nằm trên.
  useModalLayer(close, dialogRef, { enabled: open });

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-modal flex flex-col bg-background text-foreground"
    >
      {/* Kích thước giao diện: zoom đặt lên header + vùng cuộn, không lên khung fixed → nền vẫn phủ kín màn hình. */}
      <header
        style={{ zoom: uiScale }}
        className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6"
      >
        <h1 id="settings-title" className="text-base font-semibold">
          {t('SETTINGS.TITLE')}
        </h1>
        <button
          ref={closeBtnRef}
          type="button"
          onClick={close}
          title={t('COMMON.WITH_SHORTCUT', {
            label: t('SETTINGS.CLOSE'),
            keys: formatCombo(ESCAPE_COMBO, platform),
          })}
          aria-label={t('SETTINGS.CLOSE')}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors duration-normal hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <SettingsBody />
    </div>
  );
}

/**
 * Bố cục: menu trái CỐ ĐỊNH (không cuộn), chỉ cột nội dung phải cuộn. Grid 2 cột
 * đặt NGOÀI vùng cuộn để menu đứng yên khi lăn bên phải; lăn bên phải không kéo
 * cả modal. Màn hẹp (dưới md) thì xếp dọc, nội dung vẫn là phần cuộn.
 *
 * Chống co dãn khi chuyển mục:
 *   - w-full max-w-4xl → khối luôn rộng bằng nhau, không theo độ dài nội dung.
 *   - cột nội dung minmax(0,1fr) → chữ/ô dài không đẩy cột rộng ra.
 *   - OverlayScroll: tay cuộn nổi đè, không chiếm chỗ.
 * Chuyển mục thì cuộn về đầu bằng scrollTop (không remount, giữ focus nút menu).
 */
function SettingsBody() {
  const section = useSettingsModalStore((s) => s.section);
  const scrollRef = useRef<HTMLDivElement>(null);
  const uiScale = useInterfaceScale();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [section]);

  return (
    // Zoom trên cả cụm (không trên khung fixed) → nền vẫn phủ kín, cụm vẫn cao bằng màn hình.
    // px/py: cả cụm cách header + mép modal. Cả 2 panel dùng nền `settings-panel`, khác nền modal.
    <div style={{ zoom: uiScale }} className="flex min-h-0 flex-1 justify-center px-6 py-5">
      <div className="grid h-full min-h-0 w-full max-w-4xl grid-cols-1 gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
        {/* Menu: cố định (cuộn riêng nếu quá cao), không trôi theo nội dung bên phải. */}
        <div className="no-scrollbar overflow-y-auto rounded-xl bg-settings-panel p-2">
          <SettingsNav />
        </div>
        {/* Panel nội dung. Vùng cuộn đệm py-5 để tay cuộn không chạm mép trên / dưới panel. */}
        <div className="min-h-0 overflow-hidden rounded-xl bg-settings-panel">
          <OverlayScroll ref={scrollRef} className="h-full" viewportClassName="px-6 py-5">
            <div className="min-w-0">
              <SettingsContent />
            </div>
          </OverlayScroll>
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
      className="flex gap-1 md:flex-col"
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
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
