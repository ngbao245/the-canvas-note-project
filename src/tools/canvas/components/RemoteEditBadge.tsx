import type { PointerEvent as ReactPointerEvent } from 'react';
import { User, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { FOCUS_RING } from '@/lib/focus-ring';
import { useCameraStore } from '../store/camera-store';
import { requestRelease } from '../lib/edit-locks';

/** Nhãn lòi ra ngoài góc trên phải card bao nhiêu px canvas (Milanote top/right -1.4rem). */
const TAG_OUTSET = 14;

/**
 * Object đang được sửa ở tab khác (Milanote `ElementUserTag` + `remote-selected`):
 *   - Viền 2px màu người đang sửa quanh card (`warning`, khác viền chọn `primary`).
 *   - Nhãn pill cao 30px đè lên góc trên phải card: avatar 22px + tên + "×" giành
 *     quyền, vòng sáng lan ra 1.5s (tắt khi giảm chuyển động).
 * Nhãn co giãn theo card khi zoom (như nội dung card); viền bù zoom, luôn 2px màn
 * hình. Không đụng QuickLineDot ở cùng
 * góc vì object khoá ở tab khác không chọn được.
 * Hiện giờ người giữ khoá luôn là chính mình ở tab khác (chưa có tài khoản) → nhãn
 * "You" / "Bạn". Khi có `canvas-sharing`: chính mình vẫn "You", người khác thì
 * avatar + tên thật, màu theo từng người.
 */
export function RemoteEditBadge({ id }: { id: string }) {
  const { t } = useI18n();
  const zoom = useCameraStore((s) => s.camera.zoom);
  const inv = 1 / zoom;

  // Chặn pointerdown để "×" không kích kéo card / chọn vùng.
  const stop = (e: ReactPointerEvent) => e.stopPropagation();

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: 'calc(var(--radius) - 4px)',
          boxShadow: `0 0 0 ${2 * inv}px var(--warning)`,
        }}
      />
      {/* Nhãn KHÔNG bù zoom: to / nhỏ theo card khi zoom (khác viền, viền giữ 2px màn hình). */}
      <div
        data-canvas-overlay="true"
        className="absolute right-0 top-0 select-none"
        style={{ transform: `translate(${TAG_OUTSET}px, ${-TAG_OUTSET}px)` }}
      >
        <div className="flex h-[30px] items-center gap-1.5 rounded-full bg-warning pl-1 pr-1.5 text-xs font-bold text-warning-foreground shadow-md motion-safe:animate-presence-pulse">
          <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-card text-muted-foreground">
            <User className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="whitespace-nowrap">{t('CANVAS.NOTE_LOCK.OTHER_TAB')}</span>
          <button
            type="button"
            onPointerDown={stop}
            onClick={() => requestRelease(id)}
            title={t('CANVAS.NOTE_LOCK.TAKE_OVER')}
            aria-label={t('CANVAS.NOTE_LOCK.TAKE_OVER')}
            className={`grid h-5 w-5 place-items-center rounded-full opacity-80 transition-opacity duration-fast hover:opacity-100 ${FOCUS_RING}`}
          >
            <X className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
}
