import { useId, type ReactNode } from 'react';
import {
  ChevronDown,
  File,
  FileArchive,
  FileCode,
  FileText,
  FileType,
  Image as ImageIcon,
  Minus,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Switch } from '@/components/settings/SettingsBlocks';
import { useCameraStore } from '../store/camera-store';
import { useObjectsStore } from '../store/objects-store';
import { ZOOM_MAX, ZOOM_MIN } from '../types';
import { usePopup } from '../hooks/usePopup';
import { shortcutKeys, useKeyboardPlatform } from '@/lib/shortcuts';
import { CANVAS_SHORTCUT_DEFS } from '../shortcuts';

/**
 * Nút + popup của header canvas (Milanote parity): View (bấm % zoom) và Xuất.
 * Giai đoạn này chủ yếu là GIAO DIỆN:
 *   - Chạy thật: "Về 100%" / "Vừa nội dung" (đã có trước đó), thanh zoom hiện
 *     đúng mức zoom hiện tại.
 *   - Chưa chạy (tooltip "Sắp có"): nút +/-, kéo thanh zoom, Trình chiếu + 3
 *     công tắc, mọi nút Xuất.
 * Popup nằm trong header nên phóng theo Kích thước giao diện cùng header.
 */

const POPUP_CLS =
  'absolute right-0 top-full z-tooltip mt-1 flex flex-col rounded-lg border border-border bg-popover text-popover-foreground shadow-elevation-2';

// ============================================================
// View
// ============================================================

/** Nút % zoom (đặt sau nút Xuất ở hàng tiêu đề board) → mở ViewPopup.
 *  Fit / Reset vẫn chạy bằng phím F / 0 và nút trong popup. */
export function ViewMenu({ onFit, onReset }: { onFit: () => void; onReset: () => void }) {
  return (
    <HeaderMenu padding="px-2" label={<ZoomBadge />}>
      {(close) => (
        <ViewPopup
          onFit={() => {
            close();
            onFit();
          }}
          onReset={() => {
            close();
            onReset();
          }}
        />
      )}
    </HeaderMenu>
  );
}

// Cô lập subscribe zoom (đổi 60Hz lúc ramp): chỉ span nhỏ này re-render.
// boardZoom không gồm tỉ lệ giao diện → đổi Kích thước giao diện không đổi số %.
function ZoomBadge() {
  const zoom = useCameraStore((s) => s.boardZoom);
  return <span className="tabular-nums">{Math.round(zoom * 100)}%</span>;
}

function ViewPopup({ onFit, onReset }: { onFit: () => void; onReset: () => void }) {
  const { t } = useI18n();
  const platform = useKeyboardPlatform();
  const zoom = useCameraStore((s) => s.boardZoom);
  // Milanote: đang khác 100% → nút về 100%; đúng 100% → nút vừa nội dung.
  const atDefault = Math.round(zoom * 100) === 100;

  return (
    <div role="dialog" aria-label={t('CANVAS.VIEW_POPUP.ZOOM')} className={`${POPUP_CLS} w-72`}>
      <PopupSection
        title={t('CANVAS.VIEW_POPUP.ZOOM')}
        explanation={t('CANVAS.VIEW_POPUP.ZOOM_TIP', {
          keys: shortcutKeys(CANVAS_SHORTCUT_DEFS['canvas.zoom-wheel'], platform),
        })}
      >
        <ZoomSlider zoom={zoom} />
        <button
          type="button"
          onClick={atDefault ? onFit : onReset}
          className="mt-3 h-7 self-start rounded-md border border-border px-3 text-xs font-medium text-foreground transition-colors duration-normal hover:bg-muted"
        >
          {atDefault ? t('CANVAS.VIEW_POPUP.SCALE_TO_FIT') : t('CANVAS.VIEW_POPUP.RESET_100')}
        </button>
      </PopupSection>
      <Divider />
      <PopupSection
        title={t('CANVAS.VIEW_POPUP.PRESENTATION')}
        explanation={t('CANVAS.VIEW_POPUP.PRESENTATION_TIP')}
      >
        <SoonButton className="self-start bg-primary/60 px-4 text-primary-foreground">
          {t('CANVAS.VIEW_POPUP.PRESENT')}
        </SoonButton>
        <div className="mt-3 flex flex-col gap-2">
          {/* Mặc định theo Milanote: chỉ "Chỉ hiện card đang chọn" bật. */}
          <SoonToggle label={t('CANVAS.VIEW_POPUP.FOCUS_SELECTED')} checked />
          <SoonToggle label={t('CANVAS.VIEW_POPUP.HIDE_COMMENTS')} checked={false} />
          <SoonToggle label={t('CANVAS.VIEW_POPUP.PREVENT_EDITING')} checked={false} />
        </div>
      </PopupSection>
    </div>
  );
}

/**
 * Thanh zoom thang log (zoom nhân/chia đều nhau thì quãng trên thanh bằng nhau).
 * Chỉ hiện vị trí, chưa kéo được. Vạch mờ đánh dấu 100%.
 */
function ZoomSlider({ zoom }: { zoom: number }) {
  const { t } = useI18n();
  const toPct = (z: number) => {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
    return (
      ((Math.log(clamped) - Math.log(ZOOM_MIN)) / (Math.log(ZOOM_MAX) - Math.log(ZOOM_MIN))) * 100
    );
  };
  const soon = t('COMMON.COMING_SOON');
  const pct = Math.round(zoom * 100);

  return (
    <div className="flex items-center gap-2">
      <SoonIconButton icon={Minus} label={`${t('CANVAS.VIEW_POPUP.ZOOM_OUT')} (${soon})`} />
      <div className="relative h-6 flex-1" title={soon}>
        <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-muted-foreground/50"
          style={{ left: `${toPct(1)}%` }}
        />
        <span
          role="slider"
          aria-valuemin={Math.round(ZOOM_MIN * 100)}
          aria-valuemax={Math.round(ZOOM_MAX * 100)}
          aria-valuenow={pct}
          aria-valuetext={`${pct}%`}
          aria-disabled="true"
          aria-label={t('CANVAS.VIEW_POPUP.ZOOM')}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background px-1.5 text-[11px] font-medium tabular-nums text-foreground shadow-elevation-1"
          style={{ left: `${toPct(zoom)}%` }}
        >
          {pct}%
        </span>
      </div>
      <SoonIconButton icon={Plus} label={`${t('CANVAS.VIEW_POPUP.ZOOM_IN')} (${soon})`} />
    </div>
  );
}

// ============================================================
// Xuất
// ============================================================

/** Nút "Xuất ▾" → mở ExportPopup (giao diện, chưa xuất được). */
export function ExportMenu() {
  const { t } = useI18n();
  return (
    <HeaderMenu padding="px-3" label={t('CANVAS.HEADER.EXPORT')}>
      {() => <ExportPopup />}
    </HeaderMenu>
  );
}

function ExportPopup() {
  const { t } = useI18n();
  // Đếm ảnh/file trên board đang xem. Hiện chưa có type này → luôn 0, nhưng
  // giữ để khi thêm Image/File thì chữ tự đổi.
  const fileCount = useObjectsStore((s) => {
    let n = 0;
    for (const o of s.objects.values()) if (o.type === 'image' || o.type === 'file') n++;
    return n;
  });

  return (
    <div role="dialog" aria-label={t('CANVAS.HEADER.EXPORT')} className={`${POPUP_CLS} w-72`}>
      <PopupSection title={t('CANVAS.EXPORT_POPUP.LAYOUT_TITLE')}>
        <ExportItem
          icon={FileText}
          tone="text-destructive"
          label={t('CANVAS.EXPORT_POPUP.PDF_STANDARD')}
        />
        <ExportItem
          icon={FileText}
          tone="text-destructive"
          label={t('CANVAS.EXPORT_POPUP.PDF_HIGH')}
        />
        <ExportItem icon={ImageIcon} tone="text-success" label={t('CANVAS.EXPORT_POPUP.PNG')} />
      </PopupSection>
      <Divider />
      <PopupSection title={t('CANVAS.EXPORT_POPUP.LINEAR_TITLE')}>
        <div className="mb-1">
          <SoonToggle label={t('CANVAS.EXPORT_POPUP.INCLUDE_SUB_BOARDS')} checked={false} />
        </div>
        <ExportItem icon={FileType} tone="text-primary" label={t('CANVAS.EXPORT_POPUP.WORD')} />
        <ExportItem
          icon={FileCode}
          tone="text-muted-foreground"
          label={t('CANVAS.EXPORT_POPUP.MARKDOWN')}
        />
        <ExportItem
          icon={File}
          tone="text-muted-foreground"
          label={t('CANVAS.EXPORT_POPUP.PLAIN_TEXT')}
        />
      </PopupSection>
      <Divider />
      <PopupSection title={t('CANVAS.EXPORT_POPUP.FILES_TITLE')}>
        <ExportItem
          icon={FileArchive}
          tone="text-muted-foreground"
          label={
            fileCount === 0
              ? t('CANVAS.EXPORT_POPUP.NO_FILES')
              : t('CANVAS.EXPORT_POPUP.DOWNLOAD_FILES', { count: fileCount })
          }
          muted={fileCount === 0}
        />
      </PopupSection>
    </div>
  );
}

function ExportItem({
  icon: Icon,
  tone,
  label,
  muted = false,
}: {
  icon: LucideIcon;
  /** Màu icon theo loại file (token theme): PDF đỏ, ảnh xanh lá, Word xanh. */
  tone: string;
  label: string;
  /** Không có gì để tải → chữ + icon mờ hẳn (Milanote disabled). */
  muted?: boolean;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-disabled="true"
      title={muted ? label : `${label} (${t('COMMON.COMING_SOON')})`}
      className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-normal ${
        muted ? 'text-muted-foreground/60' : 'text-foreground hover:bg-muted'
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${muted ? 'text-muted-foreground/40' : tone}`}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </button>
  );
}

// ============================================================
// Khối dùng chung
// ============================================================

/** Nút mở popup ở header: chữ + mũi tên, tô nền khi đang mở. `children` nhận
 *  `close` để nút bên trong popup tự đóng sau khi chạy. */
function HeaderMenu({
  label,
  padding,
  children,
}: {
  label: ReactNode;
  /** Padding ngang: chữ dài (Xuất) px-3, số ngắn (% zoom) px-2. */
  padding: string;
  children: (close: () => void) => ReactNode;
}) {
  const { open, ref, close, toggle } = usePopup();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex h-7 items-center gap-1 rounded-md text-xs font-medium transition-colors duration-normal hover:bg-muted hover:text-foreground ${padding} ${
          open ? 'bg-muted text-foreground' : 'text-muted-foreground'
        }`}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open ? children(close) : null}
    </div>
  );
}

function PopupSection({
  title,
  explanation,
  children,
}: {
  title: string;
  explanation?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col p-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {explanation ? (
        <p className="mb-3 mt-0.5 text-xs text-muted-foreground">{explanation}</p>
      ) : (
        <div className="h-2" />
      )}
      {children}
    </section>
  );
}

function Divider() {
  return <div className="h-px bg-border" />;
}

function SoonButton({ className, children }: { className: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-disabled="true"
      title={t('COMMON.COMING_SOON')}
      className={`h-7 rounded-md text-xs font-medium ${className}`}
    >
      {children}
    </button>
  );
}

function SoonIconButton({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-label={label}
      title={label}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** Công tắc chưa có tính năng: hiện đúng trạng thái mặc định, bấm không đổi. */
function SoonToggle({ label, checked }: { label: string; checked: boolean }) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3" title={t('COMMON.COMING_SOON')}>
      <span id={id} className="text-xs text-foreground">
        {label}
      </span>
      <Switch checked={checked} onChange={noop} labelledBy={id} disabled />
    </div>
  );
}

function noop() {}
