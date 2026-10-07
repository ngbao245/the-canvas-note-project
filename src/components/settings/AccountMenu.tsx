import { useEffect, useRef, useState } from 'react';
import { HardDrive, Settings, User } from 'lucide-react';
import { useSettingsModalStore } from '@/stores/settings-modal-store';
import { useI18n } from '@/lib/i18n';
import { useEscapeLayer } from '@/lib/shortcuts';

/**
 * AccountMenu — nút avatar trên header + popup tài khoản (Milanote AccountPopup).
 *   - Phần 1: avatar + tên + dòng phụ + hành động (Cài đặt, Đăng nhập).
 *   - Phần 2: nơi đang lưu dữ liệu (Milanote để gói cước ở đây; bibo chưa có
 *     backend nên nói thật là dữ liệu nằm trên trình duyệt này).
 *
 * Chưa có auth: hiện "Khách", nút Đăng nhập tắt. Có auth thì thay phần 1.
 */

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const openSettings = useSettingsModalStore((s) => s.openSettings);
  const { t } = useI18n();
  const accountLabel = t('SETTINGS.ACCOUNT.TITLE');

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Lớp overlay: Esc chỉ đóng popup, không lọt xuống canvas.
  useEscapeLayer(() => setOpen(false), { enabled: open });

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={accountLabel}
        aria-label={accountLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-muted text-muted-foreground ring-1 ring-border transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <User className="h-6 w-6" strokeWidth={1.5} />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={accountLabel}
          className="absolute right-0 top-full z-tooltip mt-2 w-72 rounded-lg border border-border bg-popover text-popover-foreground shadow-elevation-2"
        >
          {/* Mũi tên chỉ lên avatar: tâm nút 32px nằm cách mép phải 16px. */}
          <span
            aria-hidden="true"
            className="absolute -top-[6px] right-[10px] h-3 w-3 rotate-45 border-l border-t border-border bg-popover"
          />

          <section className="flex gap-3 p-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground ring-1 ring-border">
              <User className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-foreground">
                {t('SETTINGS.ACCOUNT.STATUS.GUEST')}
              </h3>
              <p className="truncate text-xs text-muted-foreground">
                {t('SETTINGS.ACCOUNT.MENU.NOT_SIGNED_IN')}
              </p>
              <div className="mt-3 flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openSettings();
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 font-medium text-primary hover:underline"
                >
                  <Settings className="h-3.5 w-3.5" />
                  {t('SETTINGS.TITLE')}
                </button>
                <button
                  type="button"
                  disabled
                  title={t('SETTINGS.ACCOUNT.MENU.SIGN_IN_SOON')}
                  className="cursor-not-allowed text-muted-foreground opacity-60"
                >
                  {t('SETTINGS.ACCOUNT.MENU.SIGN_IN')}
                </button>
              </div>
            </div>
          </section>

          <section className="flex gap-3 border-t border-border p-4">
            <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-foreground">
                {t('SETTINGS.ACCOUNT.MENU.LOCAL_TITLE')}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('SETTINGS.ACCOUNT.MENU.LOCAL_DESCRIPTION')}
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
