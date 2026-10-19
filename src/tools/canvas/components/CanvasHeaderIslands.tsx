import type { ReactNode } from 'react';
import { AccountMenu } from '@/components/settings/AccountMenu';
import { useInterfaceScale } from '@/stores/interface-store';
import { useObjectsStore } from '../store/objects-store';
import { useI18n } from '@/lib/i18n';
import type { Board } from '../types';
import { ISLANDS_EDGE } from '../lib/header-islands';
import { BreadcrumbList } from './BreadcrumbList';
import { SaveStatusDot, ShareButton } from './BoardTitleRow';
import { ExportMenu, ViewMenu } from './HeaderPopups';
import { HeaderDivider, HelpSearchNotify, UndoRedoCluster } from './CanvasHeader';

/**
 * CanvasHeaderIslands — header kiểu đảo nổi (mockup `mockups/04b-canvas.html`), bật ở
 * Cài đặt → Canvas → Kiểu header. Canvas phủ cả màn, 3 đảo nổi trên cùng 1 hàng:
 *   - Trái: breadcrumb (tên board = mắt xích cuối, double-click đổi tên) + chấm trạng thái lưu.
 *   - Phải: đúng bộ nút của header 2 hàng (không thêm, không bỏ).
 *
 * Không còn đảo giữa (bạn chốt 2026-10-14, 3B): tên board vốn là mắt xích cuối đường dẫn.
 * Trái bó sát nội dung (max 60%), phải `min-w-max` không co; màn hẹp thì breadcrumb ẩn bớt cấp.
 *
 * Khung ngoài `pointer-events-none`: khoảng trống giữa các đảo vẫn bấm / kéo / lăn xuống
 * canvas. Mỗi đảo gắn `data-canvas-overlay`: kéo object vào đảo = vùng thả sai (`hit-test`).
 * Kích thước giao diện: CSS `zoom` ở hàng bên trong (như header cũ), mép cách màn giữ 12px.
 */
export function CanvasHeaderIslands({
  board,
  onFit,
  onReset,
}: {
  board: Board;
  onFit: () => void;
  onReset: () => void;
}) {
  const uiScale = useInterfaceScale();
  return (
    <header
      className="pointer-events-none absolute z-toolbar select-none"
      style={{ top: ISLANDS_EDGE, left: ISLANDS_EDGE, right: ISLANDS_EDGE }}
    >
      <div style={{ zoom: uiScale }} className="flex items-start justify-between gap-3">
        {/* Trái: breadcrumb (tên board là mắt xích cuối, double-click đổi tên) + chấm
            trạng thái lưu. Bỏ đảo giữa (bạn chốt 2026-10-14, 3B): tên board vốn là mắt
            xích cuối đường dẫn, không cần đảo riêng lọt thỏm giữa màn. Bó sát nội dung
            (grow=false), max-w-[60%] để board sâu không lấn đảo phải. */}
        <div className="flex min-w-0 max-w-[60%] justify-start">
          <Island className="min-w-0 max-w-full gap-2.5 pl-2.5 pr-3">
            <BreadcrumbList board={board} grow={false} editableCurrent />
            <SaveStatusDot />
          </Island>
        </div>
        {/* Phải: chỉ 1 vạch tách nhóm hành động với nhóm tài khoản; số mục là chữ xám im lặng;
            Chia sẻ là điểm nhấn duy nhất (bạn chốt 2026-10-14). min-w-max để không bị ép mất. */}
        <div className="flex min-w-max justify-end">
          <Island className="gap-1 px-1.5">
            <ObjectCountText />
            <UndoRedoCluster />
            <HelpSearchNotify />
            <HeaderDivider />
            <ShareButton />
            <ExportMenu />
            <ViewMenu onFit={onFit} onReset={onReset} />
            <AccountMenu />
          </Island>
        </div>
      </div>
    </header>
  );
}

/**
 * Số object dạng chữ xám im lặng (khác header 2 hàng dùng Badge nền đậm). Trong đảo
 * phải đã chật, badge nền đậm tranh attention với nút Chia sẻ (design-philosophy:
 * chỉ CTA được nổi). Đệm ngang để tách nhẹ cụm Undo bên phải.
 */
function ObjectCountText() {
  const count = useObjectsStore((s) => s.objects.size);
  const { t } = useI18n();
  return (
    <span className="whitespace-nowrap px-1.5 text-xs text-muted-foreground">
      {t('CANVAS.COUNT.OBJECT', { count })}
    </span>
  );
}

/** 1 đảo: nền card hơi trong + mờ nền sau, cùng kiểu với thanh công cụ trái. */
function Island({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      data-canvas-overlay="true"
      className={`pointer-events-auto flex h-11 items-center rounded-xl border border-border bg-card/90 shadow-lg backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}
