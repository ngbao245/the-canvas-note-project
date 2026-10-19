import type { ObjectTypeDefinition } from '../../hooks/useObjectRegistry';
import type { BoardData } from '../../types';
import { BoardRenderer } from './BoardObject';
import { BoardElementActions } from './BoardToolbar';

/** Định nghĩa loại object Board (tile trỏ tới board con). Đăng ký ở `objects/index.ts`. */
export const boardType: ObjectTypeDefinition = {
  type: 'board',
  renderer: BoardRenderer,
  // Milanote parity 98x139 (đo từ DOM Milanote thật): 72px icon + gap + title 2
  // dòng + secondary count.
  defaultGeometry: { width: 98, height: 139, rotation: 0, zIndex: 0 },
  // Placeholder linkedBoardId — createBoardAt override với id Board thực.
  defaultData: (): BoardData => ({ linkedBoardId: '', locked: false }),
  label: 'Board',
  showInToolbar: true,
  // Viền chọn chỉ bọc khối vuông (renderer tự đặt SelectionBox trong icon).
  ownSelectionFrame: true,
  // Toolbar chọn board: Color / Icon / Rename / More (Milanote). Không có
  // renderEditingActions: sửa tên board không đổi toolbar.
  renderElementActions: (object) => <BoardElementActions object={object} />,
};
