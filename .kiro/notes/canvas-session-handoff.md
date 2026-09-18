# Canvas — Session Handoff

Ghi 2026-09-18. Đọc file này để nắm ngữ cảnh canvas thay vì replay lịch sử chat dài.

Liên quan: `.kiro/notes/canvas-backlog.md` (backlog feature chưa làm).

## Workspace

- Workspace thật: `d:\develop\Side\bibo-hub\bibo\` (ghi ở đây).
- `d:\develop\Side\bibo-hub\bibo-hub\` là donor CŨ — chỉ đọc tham khảo pattern, KHÔNG ghi, KHÔNG copy spec sang.
- Canvas code: `src/tools/canvas/`.

## State đã ship (session 2026-09-18)

### 1. Zoom smoothness fix (`engine/camera-engine.ts`)
- Root cause "giật khi zoom": anchor drift (x/y lerp linear + zoom lerp log → progress khác nhau → cursor drift ~12px trong ramp) + re-render 60Hz (route subscribe zoom trực tiếp → cả subtree re-render).
- Fix:
  - **Anchor lock**: `zoomAnchor` field cache (worldX/worldY tại cursor lúc kick zoom). Trong `rampStep`, khi có anchor → derive x/y từ zoom(t): `x = anchor.screenX - anchor.worldX * nextZoom`. Không lerp x/y riêng. Drift = 0.
  - **Alpha 0.20** (từ 0.35): ramp settle ~333ms, overlap wheel notch 150-250ms → sliding liên tục.
  - **Isolate ZoomBadge** (`route.tsx`): tách component nhỏ subscribe zoom riêng, route + CanvasApp không re-render 60Hz.
- Step zoom giữ: notch in ×1.25, out ×0.75, detent 100% time-gated (Milanote parity).
- Verified qua Chrome DevTools MCP (đã tắt MCP sau đó).

### 2. Note polish Milanote-style
- `objects/ObjectShell.tsx`: rewrite 2-trục design system.
  - Flat mode: rounded-sm (6px), contrast shadow (inset 1px outline bg + shadow-elevation-1), ColorBar top 4px `bg-primary/60`.
  - Hand mode (`useUiStyleStore.style === 'hand'`): wrap `DrawablyCard`, ColorBar giữ, ring selection ngoài.
  - Bare variant (Image sau): chỉ ring, không shell.
- `objects/NoteObject.tsx`: padding `pl-5 pr-5 pb-5 pt-6` (20px + 4px chừa ColorBar), title `font-serif` (Fraunces), body `text-sm`, default geometry 260x160.
- Font Fraunces: `@import` Google Fonts trong `styles/index.css`, `fontFamily.serif` trong `tailwind.config.ts`.

### 3. Resize + QuickLine (`components/SelectionLayer.tsx`)
- Đổi từ 8-handle → **1 corner handle SE** (Milanote). Drag resize width+height, x/y giữ (growth from top-left).
- **QuickLineDot** top-right: visual placeholder (white circle + ring primary). Drag logic Phase C (backlog #1).
- SVG grip 2-layer (dark 50% + light 70%).
- SelectionBox có `data-canvas-overlay="true"` → click handle/dot KHÔNG kích marquee.

### 4. Header 2-row (`route.tsx`)
- Row 1 (Tools): back home + breadcrumb (`board.name`) + spacer + Undo/Redo (subscribe history-store) + divider + Theme toggle + Style toggle (drawably/flat) + Settings (placeholder chưa logic).
- Row 2 (Board): ObjectCountBadge trái + Title center (CHỈ hiện khi `!isRootBoard`, root ẩn theo yêu cầu user) + View dropdown phải (zoom% + Fit + Reset).
- Subscribe cô lập: ObjectCountBadge / UndoRedoCluster / ZoomBadge riêng để tránh re-render thừa.

### 5. Toolbar palette (`components/Toolbar.tsx`)
- Dọc trái board (absolute overlay, KHÔNG phải sidebar riêng — user reject layout grid 2 lần).
- 8 tiles SVG Milanote-style (paper `var(--card)` + line `var(--muted-foreground)`, Board dùng primary): Note, Link, Image, To-do, Board, Table, File, Line. (Bỏ Text vì "Note là text rồi".)
- **Note** = real (useToolbarDrag click/drag tạo). 7 tile còn lại = placeholder click chưa tạo (user: "trước sau cũng đụng, không làm mờ").
- Button h-12 w-12, icon 32px (theo mockup 04 comp-tile).
- Trash footer sticky (list tile scroll trong nếu overflow, max-h calc viewport).
- Wheel trong toolbar: native listener `stopPropagation` → không zoom canvas, browser scroll list bên trong.

## Object types

- **Có**: Rect (debug Phase A, dev-only), Note (polish đầy đủ Milanote).
- **Chưa**: Image, Link, To-do, Board, Table, File, Line — nút placeholder trong toolbar, chưa register renderer.

## Kiến trúc canvas (file + vai trò)

```
engine/
  camera-engine.ts (551) — CameraEngine class: target/current ref, ramp tween,
    anchor lock zoom, grid LOD, pan bounds, persist debounce. TO NHẤT.
  camera.ts (110) — pure math zoom/pan/fit (clampZoom, zoomAroundPoint...)
  coord.ts (42) — screenToCanvas / canvasToScreen
  actions.ts (238) — createObjectAt, updateObjectData, deleteObjects, resize
    commit — tất cả undo-able qua history-store
hooks/
  useObjectDrag.ts (355) — drag item canvas + edge-pan + trash + invalid zone. Hay sửa.
  useToolbarDrag.ts (169) — drag từ toolbar + ghost preview (floating overlay)
  usePointerInteraction.ts (148) — pan + marquee + click-empty-clear trên surface
  useCanvasBootstrap.ts (55) — load board/object IDB, hydrate camera
  useCanvasKeys.ts (54) — Ctrl+Z/Y undo/redo, F fit, 0 reset
  useObjectRegistry.tsx (54) — registry map type → {renderer, defaultGeometry, ...}
  useDeleteKey.ts (25) — Delete/Backspace xoá selection
store/ (Zustand)
  camera-store.ts (47) — wire engine.subscribe → snapshot 60Hz
  objects-store.ts (59) — Map<id, CanvasObject>
  selection-store.ts (30) — selectedIds Set
  history-store.ts (56) — undo/redo stack (max 100)
  interaction-store.ts (37) — mode + marqueeRect + resizeHandle + editingId
components/
  CanvasSurface.tsx (214) — surface DOM, wheel handler, grid 2-layer, mount overlays
  route.tsx (321) — CanvasRoute + Header 2-row + subcomponents inline
  Toolbar.tsx (286) — palette 8 tiles + SVG icons inline
  SelectionLayer.tsx (171) — selection box + corner resize + QuickLineDot
  ObjectsLayer.tsx (62) — render objects qua registry
  CanvasApp.tsx (30) — root: Surface + ConfirmDialog + useDeleteKey
  ContextMenu.tsx (62) — right-click menu
  MarqueeOverlay.tsx (23) — marquee rect
  ConfirmDialog.tsx (64)
  objects/
    ObjectShell.tsx (93) — vỏ chung, flat/hand variant
    NoteObject.tsx (161) — Note renderer + inline editor
    RectObject.tsx (24) — debug
    index.ts (4) — barrel side-effect register
api.ts (75) — CanvasRepository interface + IndexedDB adapter (idb-keyval)
types.ts (112) — Zod schema object/board/geometry
lib/content-bounds.ts (59) — dynamic zoom min + pan bounds
```

## Gotcha cần nhớ

- **Native wheel listener**: surface attach `wheel` native passive:false + preventDefault. React synthetic `stopPropagation` KHÔNG chặn được → phải attach native listener (toolbar wheel fix dùng cách này).
- **data-canvas-overlay**: element có attr này → surface pointerdown guard skip (không kích marquee). Toolbar + SelectionBox đều set.
- **Drag không clone**: item canvas drag = source đi theo cursor + lift shadow (không tạo clone). Theo yêu cầu user.
- **Root board title ẩn**: `isRootBoard(board)` true → title center Row 2 ẩn. Nested mới hiện.
- **updateObjectData đọc snapshot**: dùng `useObjectsStore.getState()` lại sau mutation, không đọc closure cũ (bug đã fix Phase B).
- **Object root board boardId=null**: object trên root lưu `boardId: null`, không phải rootBoard.id.

## Refactor cần làm (session mới, task đầu tiên — user chốt B2)

Code chưa "dơ" nghiêm trọng (file to nhất 551 dòng, cohesive). Nhưng tách để đọc target hơn, tiết kiệm credit:

1. **route.tsx (321)** → tách Header ra `components/CanvasHeader.tsx` (ToolsRow + BoardRow + ViewMenu + ZoomBadge). route còn ~60 dòng.
2. **Toolbar.tsx (286)** → tách SVG icons ra `components/TileIcons.tsx` (~150 dòng icon). Toolbar còn ~130.
3. **useObjectDrag.ts (355)** → tách edge-pan ra `hooks/useEdgePan.ts` (~80 dòng).
4. **camera-engine.ts (551)** → tách grid LOD math ra `engine/grid-lod.ts` (~80 dòng) + pan-bounds helper. Optional, để cuối vì cohesive.

Làm 1-3 trước (giá trị cao, low risk). #4 optional.
Verify sau mỗi tách: `npm run build` + `npm run lint`.

## Next feature (sau refactor)

Theo priority user đã bàn (chưa chốt thứ tự cuối):
- **Task B**: Rail 56px + Workspace overlay + Board CRUD (nested boards). Xem mockup `mockups/04-canvas.html`.
- **Task C**: Unsort panel phải (mockup 04 + Milanote Unsorted reference).
- **Task D**: Title editable inline (Row 2, khi nested board).
- **Object types**: Image (blob IndexedDB, paste/drop/menu) → Link (fetch metadata) → To-do. Xem backlog.

LƯU Ý: user reject 2 lần khi Kiro tự dựng Sidebar 232px / layout grid. Toolbar giữ dọc overlay. Workspace/Rail là feature riêng (Task B), KHÔNG tự refactor layout khi chỉ được yêu cầu thêm tile.

## Build/lint status

- `npm run build` pass.
- `npm run lint`: 0 errors, 5 warnings (react-refresh only-export-components — tồn tại từ trước, không blocking).
- Chưa `git init`, chưa commit.
