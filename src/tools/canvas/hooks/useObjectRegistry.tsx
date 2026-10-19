// ============================================================
// Canvas — Object type registry (Phase B)
// ============================================================
//
// Registry map `type -> definition`. Định nghĩa từng loại nằm ở
// `components/objects/xxx-type.ts(x)`, đăng ký 1 chỗ duy nhất qua mảng
// `OBJECT_TYPES` trong `components/objects/index.ts` (hiện: note, board).
// Nguồn chuẩn: `docs/system/11-object-types.md`.
//
// Engine core (coord/camera/move-resize-delete) KHÔNG đọc registry — chỉ nơi
// render, toolbar, tạo object, dán, preview kéo, resize tra vào đây.
// Nhờ vậy Phase sau / plugin thêm type mới không đụng engine.
// ============================================================

import type { ComponentType, ReactNode } from 'react';
import type { CanvasObject, Geometry } from '../types';
import { MIN_OBJECT_SIZE } from '../types';

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
  /**
   * true → renderer tự đặt `<SelectionBox>` bên trong phần tử thân của nó
   * (khi isSelected), ObjectView không vẽ viền bọc cả card. Dùng khi vùng nhìn
   * thấy nhỏ hơn khung (Board: khối vuông trong tile có tên + "N cards"; Image/
   * Link sau này nếu cần). Renderer tự quyết có icon resize hay không qua prop
   * `resizable` của SelectionBox. Viền vẫn nằm trong khối card nên cùng lớp.
   * Preview kéo cũng ăn theo vì preview render cùng Renderer.
   */
  ownSelectionFrame?: boolean;
  /**
   * Hook type-specific chạy khi user kéo góc xong (geometry có đổi). VD Note
   * chuyển heightMode 'auto' → 'fixed'. Trả `extra` để gộp side-effect VÀO
   * CÙNG bước undo với resize (Ctrl+Z 1 lần trả cả geometry lẫn data). Trả
   * `undefined` → không có side-effect, chỉ resize. SelectionBox gọi trước
   * `commitResize` rồi truyền `extra` vào đó.
   */
  onResizeCommit?: (
    objectId: string,
    before: Geometry,
    after: Geometry,
  ) => { apply: () => void; undo: () => void; redo: () => void } | undefined;

  /**
   * Kích thước tối thiểu, canvas-px. Thiếu field nào → MIN_OBJECT_SIZE chung.
   * Áp cho MỌI đường đổi cỡ (kéo góc, tự cao, undo/redo) qua `getObjectMinSize`,
   * không đọc field này trực tiếp. VD Note: rộng ≥ 160, cao ≥ 68.
   */
  minSize?: { width?: number; height?: number };
  /**
   * Lọc `data` của object đến từ nguồn không tin được (clipboard). Trả data đã
   * sạch, hoặc null để bỏ object đó. Không đăng ký → giữ nguyên data. Type nào
   * render HTML/URL do user nhập thì PHẢI đăng ký (VD Note lọc body HTML).
   */
  sanitizePastedData?: (data: unknown) => unknown | null;
  /**
   * Render buttons contextual cho element mode (single object selected). Không
   * bao gồm Dismiss (Toolbar tự render Dismiss chung). Fallback null → Toolbar
   * dùng GenericElementActions (Color/Labels/Reactions/Comment/More).
   *
   * Milanote parity: mỗi object type có cây chức năng riêng — Note = format
   * color/labels/comment; Task = priority/due-date/assignee; Link = edit URL/
   * refresh metadata; Image = crop/rotate/replace...
   */
  renderElementActions?: (object: CanvasObject) => ReactNode;
  /**
   * Render buttons contextual cho editing mode (user vào edit content). Không
   * bao gồm Dismiss (Toolbar tự render).
   *
   * Type không đăng ký field này (VD Board: chỉ sửa tên tại chỗ) → Toolbar
   * không chuyển sang editing mode, giữ nút element mode.
   */
  renderEditingActions?: (object: CanvasObject) => ReactNode;
}

const registry = new Map<string, ObjectTypeDefinition>();

/** Đăng ký 1 object type. HMR có thể gọi lại → cho phép overwrite. */
export function registerObjectType(def: ObjectTypeDefinition): void {
  registry.set(def.type, def);
}

export function getObjectTypeDefinition(type: string): ObjectTypeDefinition | undefined {
  return registry.get(type);
}

/**
 * Kích thước tối thiểu của 1 loại object: `minSize` của loại đó, thiếu thì
 * MIN_OBJECT_SIZE. Nguồn duy nhất cho mọi chỗ kẹp cỡ, để loại mới (Image, Link)
 * chỉ cần khai `minSize` là được giữ ở mọi đường đổi cỡ.
 */
export function getObjectMinSize(type: string): { width: number; height: number } {
  const min = registry.get(type)?.minSize;
  return {
    width: min?.width ?? MIN_OBJECT_SIZE,
    height: min?.height ?? MIN_OBJECT_SIZE,
  };
}

export function getAllObjectTypes(): ObjectTypeDefinition[] {
  return Array.from(registry.values());
}

/** Các type hiện trên toolbar palette, theo thứ tự đăng ký. */
export function getToolbarObjectTypes(): ObjectTypeDefinition[] {
  return getAllObjectTypes().filter((d) => d.showInToolbar);
}
