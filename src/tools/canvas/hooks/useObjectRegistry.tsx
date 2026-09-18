// ============================================================
// Canvas — Object type registry (Phase B)
// ============================================================
//
// Registry map `type -> definition`. Mỗi object type (note/image/link/rect)
// tự đăng ký renderer + defaultGeometry + defaultData + label lúc module load.
//
// Engine core (coord/camera/actions move-resize-delete) KHÔNG đọc registry —
// chỉ ObjectsLayer (render) + Toolbar (palette) + createObjectAt (tạo) tra vào đây.
// Nhờ vậy Phase sau / plugin thêm type mới không đụng engine.
// ============================================================

import type { ComponentType } from 'react';
import type { CanvasObject, Geometry } from '../types';

/** Props truyền vào renderer của mỗi object type. */
export interface ObjectRendererProps {
  object: CanvasObject;
  isSelected: boolean;
  isEditing: boolean;
  /** Renderer gọi khi kết thúc edit (blur/Escape/commit). */
  onEditEnd: () => void;
}

/** Geometry mặc định khi tạo mới (chưa có vị trí — vị trí do createObjectAt set). */
export type DefaultGeometry = Omit<Geometry, 'x' | 'y'>;

export interface ObjectTypeDefinition {
  type: string;
  /** Component render nội dung object (nằm trong ObjectShell). */
  renderer: ComponentType<ObjectRendererProps>;
  /** Kích thước + zIndex mặc định khi tạo. */
  defaultGeometry: DefaultGeometry;
  /** Factory data mặc định khi tạo (mỗi lần gọi trả object mới). */
  defaultData: () => unknown;
  /** Nhãn hiển thị trên toolbar palette. */
  label: string;
  /** Có hiện trên toolbar palette không (rect debug thì không). */
  showInToolbar?: boolean;
  /** Trả về DOM element preview khi kéo từ toolbar (hình dáng thật của type).
   *  Không có → fallback label. Ghost được style ngoài (position/scale/shadow). */
  renderPreview?: () => HTMLElement;
}

const registry = new Map<string, ObjectTypeDefinition>();

/** Đăng ký 1 object type. HMR có thể gọi lại → cho phép overwrite. */
export function registerObjectType(def: ObjectTypeDefinition): void {
  registry.set(def.type, def);
}

export function getObjectTypeDefinition(type: string): ObjectTypeDefinition | undefined {
  return registry.get(type);
}

export function getAllObjectTypes(): ObjectTypeDefinition[] {
  return Array.from(registry.values());
}

/** Các type hiện trên toolbar palette, theo thứ tự đăng ký. */
export function getToolbarObjectTypes(): ObjectTypeDefinition[] {
  return getAllObjectTypes().filter((d) => d.showInToolbar);
}
