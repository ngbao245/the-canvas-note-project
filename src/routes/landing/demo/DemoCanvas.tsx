import { useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n';
import { useDemoStore } from './demo-store';
import { boundsOf, fitRect } from './demo-camera';
import { useDemoGestures } from './useDemoGestures';
import { useDemoKeys } from './useDemoKeys';
import { DemoObjectCard } from './DemoObjectCard';
import { DemoHeader } from './DemoHeader';
import { DemoToolbar } from './DemoToolbar';
import { DemoLinks } from './DemoLinks';
import { SourcePanel } from './SourcePanel';

const GRID_STEP = 22;
const FIT_PADDING = 56;

/**
 * Canvas mini trên landing. Độc lập với canvas thật (spec canvas-landing-demo):
 * state riêng trong demo-store, không lưu, mỗi lần mount nạp lại board mẫu.
 * Tải lazy từ DemoFrame; `active` = khung đang bật (nhận lăn chuột + phím).
 */
export default function DemoCanvas({
  active,
  onRelease,
}: {
  active: boolean;
  onRelease: () => void;
}) {
  const { t } = useI18n();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const objects = useDemoStore((s) => s.objects);
  const selectedId = useDemoStore((s) => s.selectedId);
  const editingId = useDemoStore((s) => s.editingId);
  const camera = useDemoStore((s) => s.camera);
  const { draggingId, handlers } = useDemoGestures(surfaceRef, active);
  useDemoKeys({ active, onRelease });

  const fitToContent = () => {
    const el = surfaceRef.current;
    const bounds = boundsOf(useDemoStore.getState().objects);
    if (!el || !bounds) return;
    useDemoStore
      .getState()
      .setCamera(fitRect(bounds, el.clientWidth, el.clientHeight, FIT_PADDING));
  };

  // Nạp board mẫu rồi căn camera ngay khi khung có kích thước thật.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    useDemoStore.getState().reset();
    let fitted = false;
    const ro = new ResizeObserver(([entry]) => {
      if (fitted || !entry) return;
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;
      fitted = true;
      const bounds = boundsOf(useDemoStore.getState().objects);
      if (bounds) useDemoStore.getState().setCamera(fitRect(bounds, width, height, FIT_PADDING));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Nhả khung thì ghi chữ đang sửa, để lần bật sau không còn ô sửa mở dở.
  useEffect(() => {
    if (!active) useDemoStore.getState().finishEdit();
  }, [active]);

  const gridSize = GRID_STEP * camera.zoom;

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      <DemoHeader
        onReset={() => {
          useDemoStore.getState().reset();
          fitToContent();
        }}
      />
      <div className="relative min-h-0 flex-1 select-none overflow-hidden">
        <div
          ref={surfaceRef}
          role="application"
          aria-label={t('LANDING.DEMO.REGION_LABEL')}
          className="absolute inset-0 touch-none"
          style={{
            backgroundImage: 'radial-gradient(var(--border-strong) 1px, transparent 1.5px)',
            backgroundSize: `${gridSize}px ${gridSize}px`,
            backgroundPosition: `${camera.x}px ${camera.y}px`,
          }}
          {...handlers}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})`,
            }}
          >
            <DemoLinks />
            {objects.map((obj) => (
              <DemoObjectCard
                key={obj.id}
                obj={obj}
                selected={obj.id === selectedId}
                dragging={obj.id === draggingId}
                editing={obj.id === editingId}
              />
            ))}
          </div>
        </div>
        {objects.length === 0 && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            {t('LANDING.DEMO.EMPTY')}
          </p>
        )}
        <DemoToolbar surfaceRef={surfaceRef} />
        <SourcePanel />
      </div>
    </div>
  );
}
