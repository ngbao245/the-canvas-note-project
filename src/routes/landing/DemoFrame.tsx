import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ErrorState, Skeleton } from '@/components/shared';
import { useI18n } from '@/lib/i18n';
import { FOCUS_RING } from '@/lib/focus-ring';
import { useMediaQuery } from './useMediaQuery';
import { DemoStaticSketch } from './sketch/DemoStaticSketch';
import { SketchFrame } from './sketch/SketchFrame';

/**
 * Khung canvas thử trên landing (spec canvas-landing-demo US-2, US-5).
 *
 * 3 trạng thái:
 *   - Nghỉ: lớp phủ "Bấm để thử" che canvas, lăn chuột cuộn trang, phím demo tắt.
 *   - Bật: bỏ lớp phủ, canvas nhận lăn chuột + phím.
 *   - Nhả: về Nghỉ khi bấm ra ngoài khung, hoặc Esc lúc không còn gì để đóng.
 * Dưới 900px: không tải canvas mini, hiện hình vẽ tĩnh.
 */

const WIDE_QUERY = '(min-width: 900px)';

export function DemoFrame() {
  const wide = useMediaQuery(WIDE_QUERY);
  return wide ? <InteractiveFrame /> : <NarrowFrame />;
}

function InteractiveFrame() {
  const { t } = useI18n();
  const [active, setActive] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLButtonElement>(null);
  const focusOverlayOnRelease = useRef(false);

  // Tạo lại lazy khi bấm Thử lại: React.lazy giữ promise lỗi, dùng lại sẽ lỗi mãi.
  const DemoCanvas = useMemo(
    () => lazy(() => import('./demo/DemoCanvas')),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- attempt chỉ để tạo lazy mới
    [attempt],
  );

  // Bấm ra ngoài khung lúc đang bật → nhả.
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (e: PointerEvent) => {
      const frame = frameRef.current;
      if (frame && e.target instanceof Node && !frame.contains(e.target)) setActive(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [active]);

  // Bật: đưa focus vào khung để Tab tiếp theo đi vào trong demo.
  // Nhả bằng Esc: trả focus về lớp phủ để người dùng bàn phím không bị lạc.
  useEffect(() => {
    if (active) {
      frameRef.current?.focus({ preventScroll: true });
    } else if (focusOverlayOnRelease.current) {
      focusOverlayOnRelease.current = false;
      overlayRef.current?.focus({ preventScroll: true });
    }
  }, [active]);

  const releaseByKey = () => {
    focusOverlayOnRelease.current = true;
    setActive(false);
  };

  return (
    <div>
      <div
        ref={frameRef}
        tabIndex={-1}
        data-active={active}
        className="sk-demo-frame relative h-[600px] overflow-hidden outline-none"
      >
        <LoadBoundary
          key={attempt}
          fallback={(retry) => (
            <div className="flex h-full items-center justify-center bg-background">
              <ErrorState
                message={t('LANDING.DEMO.LOAD_ERROR')}
                onRetry={() => {
                  retry();
                  setAttempt((n) => n + 1);
                }}
              />
            </div>
          )}
        >
          <Suspense fallback={<DemoSkeleton />}>
            <DemoCanvas active={active} onRelease={releaseByKey} />
          </Suspense>
        </LoadBoundary>
        {!active && (
          <button
            ref={overlayRef}
            type="button"
            onClick={() => setActive(true)}
            className={`absolute inset-0 z-header flex items-center justify-center ${FOCUS_RING}`}
            style={{ background: 'color-mix(in srgb, var(--background) 40%, transparent)' }}
          >
            <span className="sk-tap-label">
              {t('LANDING.DEMO.ACTIVATE')}
              <small>{t('LANDING.DEMO.ACTIVATE_HINT')}</small>
            </span>
          </button>
        )}
      </div>
      <p className="sk-frame-hint" aria-live="polite">
        {active ? t('LANDING.DEMO.RELEASE_HINT') : '\u00a0'}
      </p>
    </div>
  );
}

function NarrowFrame() {
  const { t } = useI18n();
  return (
    <div>
      <SketchFrame tilt={-0.6}>
        <DemoStaticSketch />
      </SketchFrame>
      <p className="sk-frame-hint">{t('LANDING.DEMO.NARROW')}</p>
    </div>
  );
}

/** Skeleton đúng khung: header gọn + mặt canvas chấm bi + 3 card. */
function DemoSkeleton() {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-11 items-center gap-2 border-b border-border bg-card px-3">
        <Skeleton className="mr-auto h-4 w-28" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="relative flex-1">
        <Skeleton className="absolute left-3 top-3 h-[60px] w-[60px]" />
        <Skeleton className="absolute left-[22%] top-[22%] h-40 w-64" />
        <Skeleton className="absolute left-[52%] top-[26%] h-36 w-60" />
        <Skeleton className="absolute left-[30%] top-[58%] h-32 w-56" />
      </div>
    </div>
  );
}

/** Bắt lỗi tải chunk canvas mini. Lỗi khác trong demo cũng rơi vào đây. */
class LoadBoundary extends Component<
  { fallback: (retry: () => void) => ReactNode; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.error('[landing] canvas thử lỗi', error);
  }

  override render() {
    if (this.state.failed) return this.props.fallback(() => this.setState({ failed: false }));
    return this.props.children;
  }
}
