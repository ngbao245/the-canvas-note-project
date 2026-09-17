import { useInteractionStore } from '../store/interaction-store';

/**
 * Marquee selection rectangle. Screen space, không transform theo camera.
 * Render trực tiếp trong CanvasSurface (bên ngoài world layer).
 */
export function MarqueeOverlay() {
  const mode = useInteractionStore((s) => s.mode);
  const rect = useInteractionStore((s) => s.marqueeRect);
  if (mode !== 'marquee' || !rect) return null;

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        border: '1px dashed var(--primary)',
        background: 'var(--primary-soft)',
      }}
    />
  );
}
