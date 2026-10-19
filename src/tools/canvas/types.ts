// ============================================================
// Canvas — Data model + Zod schemas
// ============================================================
//
// Object model polymorphic. Engine chỉ chạm `geometry` + `type` + `id` +
// `boardId` + `zIndex`, KHÔNG đọc `data`. Renderer (Phase B+) đọc `data` theo
// object type của mình. Nhờ đó Phase B thêm loại object (note/text/image/link)
// không đụng engine core.
//
// `boardId` luôn là id board thật, kể cả board gốc (Home).
// ============================================================

import { z } from 'zod';

// --- Geometry ---
// Vị trí + kích thước + orientation trong canvas-space.
// x, y = top-left corner. rotation reserved cho Phase C/D.
export const geometrySchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().min(1),
  height: z.number().min(1),
  rotation: z.number().default(0),
  zIndex: z.number().default(0),
});
export type Geometry = z.infer<typeof geometrySchema>;

// --- CanvasObject ---
// `type` là string, không union enum — renderer registry register type mới
// runtime. Engine không care type cụ thể.
// `data: unknown` — renderer tự cast sang type của mình bằng Zod (Phase B).
export const canvasObjectSchema = z.object({
  id: z.string(),
  type: z.string(), // loại trong sổ `components/objects/index.ts` (hiện 'note' | 'board'), xem docs/system/11-object-types.md
  boardId: z.string(), // id board chứa object (Home cũng là id thật)
  geometry: geometrySchema,
  data: z.unknown(),
  /**
   * Unsort placement (từ spec canvas-unsort):
   *   null = trên canvas, render theo geometry.
   *   ≥ 0 = trong Unsort của boardId, thứ tự tăng từ 0 (top).
   * Object cũ (không có field) → default null, giữ trên canvas như hiện tại.
   */
  unsortIndex: z.number().int().min(0).nullable().default(null),
  /**
   * Tăng mỗi lần object được ghi xuống: lúc ghi đọc số trên đĩa trong cùng transaction
   * rồi +1 (api.ts `writeObjects`), nên không lùi / trùng giữa tab hay khi undo. Caller
   * không tự tăng. Bản trong store có thể giữ số cũ, không sao. `canvas-sync` dùng để
   * phát hiện sửa chen ngang (bản máy, server có thể cấp số riêng).
   */
  version: z.number().int().min(0).default(0),
  createdAt: z.string(), // ISO
  updatedAt: z.string(), // ISO
});
export type CanvasObject = z.infer<typeof canvasObjectSchema>;

// --- Object data schemas per type (Phase B) ---
// `CanvasObject.data` là `unknown` ở schema gốc. Mỗi renderer parse phần data
// của type mình qua schema dưới đây. Engine core không đọc các field này.

/**
 * Note (Milanote parity): rich text qua Tiptap.
 *
 * `body` chứa HTML string (Tiptap `.getHTML()`). Structure điển hình:
 *   <h1>Heading</h1><p>Paragraph</p><p>Another</p>
 *
 * Mỗi Enter = paragraph mới. Heading/bold/italic/list/link do user chọn qua
 * toolbar editing mode (StarterKit + extension-link).
 *
 * Đọc qua `lib/note-data.ts::parseNoteData` (chỉ điền mặc định, không chuyển
 * dạng cũ).
 *
 * Màu (`color` thanh, `background` nền, `textColor` chữ đi kèm): chọn qua popup
 * Màu toolbar element mode. Bảng màu ở `lib/note-colors.ts`.
 */
export const noteDataSchema = z.object({
  body: z.string().default('<p></p>'),
  /** Màu thanh trên đầu note (tab Top strip). Hex hoặc null. */
  color: z.string().nullable().default(null),
  /** Màu nền cả note (tab Background). Hex, 'transparent' hoặc null (nền card). */
  background: z.string().nullable().default(null),
  /** Màu chữ đi kèm khi chọn ô cặp "A". null = chữ tự tương phản theo nền. */
  textColor: z.string().nullable().default(null),
  /**
   * Height mode (Milanote parity):
   *   - 'auto': RO auto-grow theo content khi content vượt geometry (mặc định
   *     note mới tạo). User gõ Enter → note cao ra.
   *   - 'fixed': user đã kéo corner set explicit height. RO KHÔNG grow. Nếu
   *     content vượt geometry → clip + fade overlay bottom (sương mờ hint).
   *
   * Chuyển 'auto' → 'fixed' tự động khi user drag corner Note (bất kỳ dim).
   * Chưa có UI reset về 'auto' (Milanote cũng không có — user muốn note lớn
   * lại thì tự kéo corner).
   */
  heightMode: z.enum(['auto', 'fixed']).default('auto'),
  /**
   * Khoá vị trí (Milanote "Lock Position"): true → không kéo di chuyển, không
   * kéo góc đổi cỡ. Vẫn chọn / mở sửa / đổi màu được. Toggle qua menu More.
   */
  locked: z.boolean().default(false),
});
export type NoteData = z.infer<typeof noteDataSchema>;

/** Image: pixel ảnh KHÔNG nằm trong object, chỉ giữ blobId trỏ tới blob store. */
export const imageDataSchema = z.object({
  blobId: z.string(),
  mimeType: z.string(),
  naturalWidth: z.number(),
  naturalHeight: z.number(),
});
export type ImageData = z.infer<typeof imageDataSchema>;

/** Link: favicon suy ra từ hostname lúc render (không lưu ảnh). */
export const linkDataSchema = z.object({
  url: z.string(),
  title: z.string().default(''),
  hostname: z.string().default(''),
});
export type LinkData = z.infer<typeof linkDataSchema>;

/**
 * Icon của board (spec canvas-board-icon): hiển thị giữa ô vuông board tile.
 *   - kind 'lucide': `value` là tên icon lucide dạng kebab-case ('star', 'arrow-up').
 *     Lúc render chuyển sang PascalCase tra component từ lucide-react.
 *   - kind 'text': `value` là ký tự người dùng tự nhập (tối đa 2 ký tự).
 * Không icon → field `icon` = null (board cũ không có field cũng về null).
 */
export const boardIconSchema = z.object({
  kind: z.enum(['lucide', 'text']),
  value: z.string(),
});
export type BoardIcon = z.infer<typeof boardIconSchema>;

/** Giới hạn ký tự khi tự nhập icon chữ (giữ chữ đủ to trong ô 72x72). */
export const BOARD_ICON_TEXT_MAX = 2;

/**
 * Board object (type='board' trên canvas cha): tile đại diện board con.
 * Chỉ giữ ref sang Board entity — name/color/count đọc từ Board + objects store
 * lúc render, không duplicate.
 */
export const boardDataSchema = z.object({
  linkedBoardId: z.string(),
  /** Khoá vị trí tile (Milanote "Lock Position"), như note. Toggle qua menu More. */
  locked: z.boolean().default(false),
});
export type BoardData = z.infer<typeof boardDataSchema>;

// --- Camera ---
// State pan + zoom của viewport. 1 camera / board.
// Range schema permissive (0.01 - 20) để tolerate legacy data. Engine constants
// ZOOM_MIN/ZOOM_MAX (0.05 - 3) là UX range thực tế, hydrate clamp về UX range.
export const cameraSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  zoom: z.number().min(0.01).max(20).default(1),
});
export type Camera = z.infer<typeof cameraSchema>;

// --- Board ---
// Phase A chỉ có 1 root board "Home". Nested-boards nhiều board qua parentId.
// `color` là hex "#RRGGBB", rotate qua BOARD_COLOR_PALETTE khi tạo mới. Board
// record cũ (trước nested-boards) không có field này → default zinc neutral
// để không break hydrate.
export const boardSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable().default(null),
  color: z.string().default('#71717a'),
  // Icon board tile (spec canvas-board-icon). Board cũ không có field → null (không icon).
  icon: boardIconSchema.nullable().default(null),
  camera: cameraSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Board = z.infer<typeof boardSchema>;

// --- Constants ---
/** Absolute safety floor. Content-aware min zoom sẽ clamp cao hơn. */
export const ZOOM_MIN = 0.05;
/** Milanote-like 300% max. Không content-aware, luôn constant. */
export const ZOOM_MAX = 3;
/**
 * Milanote parity — user luôn được zoom out tới ít nhất 40% dù canvas trống
 * hay content nhỏ gọn. Chỉ khi content trải rộng, dynamic min hạ xuống dưới
 * ngưỡng này để cho phép thấy hết. Xem `computeDynamicZoomMin`.
 */
export const ZOOM_OUT_BASELINE = 0.4;
export const MIN_OBJECT_SIZE = 40;

// --- Board color palette ---
// Milanote-inspired 6 màu. Rotate theo thứ tự Board tạo trong cùng parent để
// consistent giữa các session (không random). Index 0 = neutral zinc cho root.
export const BOARD_COLOR_PALETTE = [
  '#71717a', // zinc — neutral default
  '#cb997e', // tan
  '#e9785e', // coral
  '#a5b18d', // sage
  '#7d9dc7', // sky
  '#d48ea6', // rose
] as const;

/** Lấy màu từ palette theo index; wrap-around khi index vượt độ dài. */
export function boardColorForIndex(index: number): string {
  const len = BOARD_COLOR_PALETTE.length;
  const i = ((index % len) + len) % len;
  return BOARD_COLOR_PALETTE[i];
}

// --- Helpers ---
export function makeDefaultBoard(): Board {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'Home',
    parentId: null,
    color: BOARD_COLOR_PALETTE[0],
    icon: null,
    camera: { x: 0, y: 0, zoom: 1 },
    createdAt: now,
    updatedAt: now,
  };
}

/** Semantic check: board có phải root board không? */
export function isRootBoard(board: Board): boolean {
  return board.parentId === null;
}
