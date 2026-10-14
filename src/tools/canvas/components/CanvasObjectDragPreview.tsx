import { useShallow } from 'zustand/react/shallow';
import { useObjectsStore } from '../store/objects-store';
import { useCanvasDragStore } from '../store/canvas-drag-store';
import { useCameraStore } from '../store/camera-store';
import type { CanvasObject } from '../types';
import { FloatingObjectPreview } from './FloatingObjectPreview';

/**
 * Bản xem trước nổi lúc kéo object canvas. Kéo nhiều: vẽ CẢ CỤM, mỗi object giữ
 * đúng khoảng cách với object chính (object vẫn thuộc board này tới khi thả,
 * nên phải thấy được, không ẩn). Object thật trong world vẫn ẩn tại chỗ
 * (useObjectDrag) để không thấy 2 bản.
 *
 * Portal ra body qua FloatingObjectPreview → nổi trên toolbar, header, panel.
 */
export function CanvasObjectDragPreview() {
  const drag = useCanvasDragStore((s) => s.drag);
  const zoom = useCameraStore((s) => s.camera.zoom);
  // Chỉ theo dõi các object đang kéo, không theo cả Map (gõ note khác không render lại).
  const objects = useObjectsStore(
    useShallow((s) => {
      if (!drag) return [];
      const list: CanvasObject[] = [];
      for (const id of drag.ids) {
        const o = s.objects.get(id);
        if (o) list.push(o);
      }
      return list;
    }),
  );
  if (!drag) return null;
  const primary = objects.find((o) => o.id === drag.primaryId);
  if (!primary) return null;

  // Vẽ theo thứ tự lớp: object trên cùng nằm cuối (DOM sau đè DOM trước).
  const ordered = [...objects].sort((a, b) => a.geometry.zIndex - b.geometry.zIndex);

  return (
    <>
      {ordered.map((o) => (
        <FloatingObjectPreview
          key={o.id}
          object={o}
          clientX={drag.clientX}
          clientY={drag.clientY}
          // Lệch so với object chính (canvas-space × zoom = px màn hình). Các
          // object cùng dời bằng applyMoveDelta nên khoảng lệch không đổi khi kéo.
          grabOffsetX={drag.grabOffsetX - (o.geometry.x - primary.geometry.x) * zoom}
          grabOffsetY={drag.grabOffsetY - (o.geometry.y - primary.geometry.y) * zoom}
          dim={drag.dim}
          // Object đang kéo luôn nằm trong vùng chọn → giữ viền như item thật.
          selected
        />
      ))}
    </>
  );
}
