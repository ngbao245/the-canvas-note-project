import type { ObjectTypeDefinition } from '../../hooks/useObjectRegistry';
import { RectRenderer } from './RectObject';

/** Định nghĩa loại object Rect (debug Phase A, chỉ để đọc data cũ). Đăng ký ở `objects/index.ts`. */
export const rectType: ObjectTypeDefinition = {
  type: 'rect',
  renderer: RectRenderer,
  defaultGeometry: { width: 200, height: 120, rotation: 0, zIndex: 0 },
  defaultData: () => ({}),
  label: 'Rect',
  showInToolbar: false,
};
