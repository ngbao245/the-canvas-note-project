import { registerObjectType } from '../../hooks/useObjectRegistry';
import { noteType } from './note-type';
import { boardType } from './board-type';

// Danh sách mọi loại object trên canvas. Thêm loại mới: viết renderer
// `XxxObject.tsx` + định nghĩa `xxx-type.ts(x)`, rồi thêm vào mảng này.
// Thứ tự = thứ tự hiện trên toolbar palette.
// CanvasSurface import file này 1 lần để sổ đầy đủ trước khi render.
const OBJECT_TYPES = [noteType, boardType];

for (const def of OBJECT_TYPES) registerObjectType(def);
