import { useObjectsStore } from '../store/objects-store';
import { useCanvasDragStore } from '../store/canvas-drag-store';
import { FloatingObjectPreview } from './FloatingObjectPreview';

/**
 * Floating preview cho canvas object drag. Subscribe canvas-drag-store,
 * render FloatingObjectPreview khi có drag primary.
 *
 * Portal ra body qua FloatingObjectPreview → bay trên toolbar, header, panel,
 * mọi overlay. Đồng bộ visualize với Toolbar drag (useToolbarDrag.preview)
 * và Unsort drag-out (UnsortDragPreview).
 *
 * Multi-select drag: chỉ primary có preview, các item selected khác bị hidden
 * trong world layer bởi useObjectDrag (visibility:hidden). Milanote parity.
 */
export function CanvasObjectDragPreview() {
  const drag = useCanvasDragStore((s) => s.drag);
  // Chỉ theo dõi object đang kéo, không theo cả Map (gõ note khác không render lại).
  const object = useObjectsStore((s) => (drag ? s.objects.get(drag.primaryId) : undefined));
  if (!drag || !object) return null;

  return (
    <FloatingObjectPreview
      object={object}
      clientX={drag.clientX}
      clientY={drag.clientY}
      grabOffsetX={drag.grabOffsetX}
      grabOffsetY={drag.grabOffsetY}
      dim={drag.dim}
      // Primary drag luôn selected (useObjectDrag tự select trong onPointerDown
      // nếu chưa). Viền ring theo card, không được thiếu.
      selected
    />
  );
}
