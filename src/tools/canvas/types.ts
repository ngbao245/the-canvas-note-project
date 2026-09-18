// ============================================================
// Canvas — Data model + Zod schemas
// ============================================================
//
// Object model polymorphic. Engine chỉ chạm `geometry` + `type` + `id` +
// `boardId` + `zIndex`, KHÔNG đọc `data`. Renderer (Phase B+) đọc `data` theo
// object type của mình. Nhờ đó Phase B thêm loại object (note/text/image/link)
// không đụng engine core.
//
// `boardId: string | null` sẵn từ Phase A (null = root board). Phase D nested
// boards không phải migrate schema.
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
  type: z.string(), // 'rect' Phase A; 'note' | 'text' | 'image' | 'link' Phase B
  boardId: z.string().nullable(), // null = root board
  geometry: geometrySchema,
  data: z.unknown(),
  createdAt: z.string(), // ISO
  updatedAt: z.string(), // ISO
});
export type CanvasObject = z.infer<typeof canvasObjectSchema>;

// --- Object data schemas per type (Phase B) ---
// `CanvasObject.data` là `unknown` ở schema gốc. Mỗi renderer parse phần data
// của type mình qua schema dưới đây. Engine core không đọc các field này.

/** Note: ghi chữ plain (rich text hoãn sang Phase C). */
export const noteDataSchema = z.object({
  title: z.string().default(''),
  body: z.string().default(''),
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
// Phase A chỉ có 1 root board "Home". Phase D nhiều board nested qua parentId.
export const boardSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable().default(null),
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

// --- Helpers ---
export function makeDefaultBoard(): Board {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'Home',
    parentId: null,
    camera: { x: 0, y: 0, zoom: 1 },
    createdAt: now,
    updatedAt: now,
  };
}

/** Semantic check: board có phải root board không? */
export function isRootBoard(board: Board): boolean {
  return board.parentId === null;
}
