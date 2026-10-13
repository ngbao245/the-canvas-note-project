# Canvas — Session Handoff

Ghi 2026-09-18, cập nhật tới 2026-10-11 (mục cuối file = việc còn mở). Đọc file này để nắm ngữ cảnh canvas thay vì replay lịch sử chat dài. Mục cũ ghi theo thời gian; chỗ nào bị session sau thay thế đã đánh dấu "(đã thay ở ...)".

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

### 4. Header 2-row (`route.tsx`) — LỖI THỜI, xem "Header hiện tại (chốt 2026-10-06)" cuối file
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
  camera-engine.ts (~470) — CameraEngine class: target/current ref, ramp tween,
    anchor lock zoom, persist debounce, DOM write. Import pan-bounds + grid-lod.
  camera.ts (110) — pure math zoom/pan/fit (clampZoom, zoomAroundPoint...)
  pan-bounds.ts — clampCameraToBounds(camera, bounds, viewport) pure
  grid-lod.ts — computeGridLod(camera) pure, trả dense+sparse layer info
  coord.ts — screenToCanvas / canvasToScreen / clientToCanvas / aabbIntersect
  actions.ts (238) — createObjectAt, updateObjectData, deleteObjects, resize
    commit — tất cả undo-able qua history-store
hooks/
  useObjectDrag.ts (~280) — drag item canvas + trash + invalid zone. Edge-pan tách ra useEdgePan.
  useEdgePan.ts (~110) — createEdgePanLoop: edge auto-pan rAF loop khi drag gần rìa.
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
  CanvasHeader.tsx (~300) — header 2-row (IconButton, ToolsRow, BoardRow, ViewMenu, ZoomBadge...)
  TileIcons.tsx (~130) — TileType + TileIcon (8 SVG palette)
  Toolbar.tsx (~150) — palette layout + drag (icon ở TileIcons)
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
    index.ts — mảng OBJECT_TYPES, đăng ký mọi loại object (định nghĩa ở *-type.ts(x))
api.ts (75) — CanvasRepository interface + IndexedDB adapter (idb-keyval)
types.ts (112) — Zod schema object/board/geometry
lib/content-bounds.ts (59) — dynamic zoom min + pan bounds
lib/dom.ts — isEditableTarget (shared)
lib/hit-test.ts — hitZone(clientX, clientY) → trash|overlay|canvas|outside (shared)
```

## Gotcha cần nhớ

- **RULE CỨNG: card selected LUÔN có viền đi kèm** — kể cả khi drag preview,
  float ra body, portal, hover, hoặc bất cứ visual state nào. Card có 2 thứ đi
  chung: card + viền ring primary. Không được tách rời. Cụ thể:
  - FloatingObjectPreview có prop `selected` → pass true cho canvas drag +
    unsort drag (item selected). Toolbar drag = false (item chưa tồn tại).
  - Khi mode='dragging', SelectionLayer world skip render (viền đã theo preview
    ở screen-space). Không được để 2 layer viền cùng vẽ, lệch khi zoom ≠ 100%.
  - Nếu thêm case drag mới (Line, Image resize, group drag...) → phải kế thừa
    rule này, không được ship preview trần.

- **Native wheel listener**: surface attach `wheel` native passive:false + preventDefault. React synthetic `stopPropagation` KHÔNG chặn được → phải attach native listener (toolbar wheel fix dùng cách này).
- **data-canvas-overlay**: element có attr này → surface pointerdown guard skip (không kích marquee). Toolbar + SelectionBox đều set.
- **Drag không clone**: item canvas drag = source đi theo cursor + lift shadow (không tạo clone). Theo yêu cầu user.
- **Root board title ẩn**: `isRootBoard(board)` true → title center Row 2 ẩn. Nested mới hiện.
- **updateObjectData đọc snapshot**: dùng `useObjectsStore.getState()` lại sau mutation, không đọc closure cũ (bug đã fix Phase B).
- **Object root board boardId=null**: object trên root lưu `boardId: null`, không phải rootBoard.id.

## Refactor B2 — ĐÃ LÀM (session 2026-09-18)

Tách file + rút helper reuse. Build + lint pass, 0 error (5 warning react-refresh cũ).

Util mới (dùng chung):
- `lib/dom.ts` — `isEditableTarget` (trước copy 3 lần trong usePointerInteraction / useCanvasKeys / useDeleteKey).
- `lib/hit-test.ts` — `hitZone(clientX, clientY)` trả `'trash' | 'overlay' | 'canvas' | 'outside'`. Gom logic `elementFromPoint + closest` từ useObjectDrag / useToolbarDrag / useEdgePan.
- `engine/coord.ts` thêm `clientToCanvas(clientX, clientY, camera)` — tự lấy surface rect + convert, thay công thức tính tay rải rác.

Component/hook tách ra:
- `components/CanvasHeader.tsx` — toàn bộ header 2 row (IconButton, ToolsRow, StyleToggle, Breadcrumb, UndoRedoCluster, BoardRow, ObjectCountBadge, ViewMenu, ViewMenuItem, ZoomBadge). route.tsx còn ~70 dòng chỉ lo bootstrap + fit/reset.
- `components/TileIcons.tsx` — `TileType` + `TileIcon` (8 SVG). Toolbar.tsx còn layout + drag.
- `hooks/useEdgePan.ts` — `createEdgePanLoop({ isDragging, getCursor, getDraggingIds, reposition })` trả `{ start, stop }`. useObjectDrag gọi thay cho panLoopStep inline.

Gom UI trùng:
- `IconButton` (trong CanvasHeader) — gom class nút icon 28px lặp 6 chỗ (theme/style/settings/undo/redo/back).
- `TileButton` + `ToolTile` (Toolbar) — gộp ToolButton + PlaceholderButton cũ (chỉ khác optional onPointerDown).

Camera-engine cũng đã tách:
- `engine/pan-bounds.ts` — `clampCameraToBounds(camera, bounds, viewport)` pure.
- `engine/grid-lod.ts` — `computeGridLod(camera, base?)` pure, trả `{ dense, sparse }` layer info. `GRID_BASE = 32` const.
- `camera-engine.ts` (~470) giữ class + rAF ramp + DOM write orchestration, import 2 helper.

## Unsort Panel — SHIP 2026-09-18 (cùng session)

Spec: `.kiro/specs/canvas-unsort/` — 12 task done. Build 7.6s pass, lint 0 error.

### Schema thay đổi (types.ts)
- `CanvasObject.unsortIndex: number | null` default `null` (Zod default → object cũ hydrate OK, không migrate).
  - `null` = trên canvas, render theo geometry.
  - `≥ 0` = trong Unsort của boardId đó, thứ tự tăng từ 0 (top).

### Files mới
- `store/unsort-store.ts` — `panelOpen`, `drag` state (source/target index, outsidePanel, cursor).
- `hooks/useUnsortDrag.ts` — pointer drag cho reorder trong panel + drag-out ra canvas / Board tile khác.
- `components/UnsortPanel.tsx` — panel 260px + toggle tab góc phải canvas.
- `components/UnsortItem.tsx` — 1 item render (icon type + name + subtitle), CSS transform shift preview khi reorder.

### Files sửa
- `types.ts` — thêm `unsortIndex` field.
- `engine/actions.ts` — **rewrite** `moveObjectsToBoard` → `moveObjectsToUnsort`. Thêm `moveFromUnsortToCanvas`, `reorderInUnsort`, `moveToUnsortHere` (Ctrl+Shift+U).
- `components/ObjectsLayer.tsx` — filter `unsortIndex === null` (chỉ render canvas objects, Unsort items thuộc UnsortPanel).
- `components/CanvasApp.tsx` — grid layout `1fr 260px|0px` với transition, mount UnsortPanel. Ctrl+Shift+U handler cho `moveToUnsortHere`. Escape đóng Unsort panel.
- `components/CanvasSurface.tsx` — mount `<UnsortToggle />` overlay bên trong.
- `hooks/useObjectDrag.ts` — cross-board drop giờ call `moveObjectsToUnsort` (không phải `moveObjectsToBoard` cũ), object rơi vào Unsort đích thay vì đặt canvas.

### Behavior change từ nested-boards (session trước)
- **Cross-board drop**: từ giờ luôn đưa object vào Unsort của board đích (top, unsortIndex=0). Không đặt canvas board đích. Giải quyết vấn đề "handle vị trí" user nêu.
- User vào board đích → object nằm trong Unsort panel, tự kéo ra canvas để đặt vị trí.

### Gotcha
- **`moveObjectsToUnsort` fire-and-forget async**: reindex items cũ trong Unsort đích query IDB async. UI immediate remove object khỏi current view; user vào target board sau đó thấy state đúng.
- **`objects-store` giờ hold cả canvas + Unsort items của current view**: chỉ khác `unsortIndex`. Filter khi render (ObjectsLayer vs UnsortPanel).
- **Selection share với canvas**: Ctrl+Click/Shift+Click item trong Unsort dùng `useSelectionStore` chung. Object.id unique không xung đột.
- **Delete từ Unsort dùng lại `useDeleteKey`**: không cần logic riêng. Board object trong Unsort → cascade dialog như canvas.
- **Reorder ITEM_HEIGHT = 60px** hardcode trong `useUnsortDrag` + `UnsortItem` — nếu đổi padding item phải sync cả 2 chỗ.
- **Panel width transition qua `grid-template-columns`** 200ms ease-standard. Panel luôn mount (không unmount) để giữ state.
- **UnsortToggle ẩn khi panel mở** (return null). Đóng bằng X button trong header hoặc Escape.

### Manual test checklist (từ tasks.md)
1. Bấm tab Unsort góc phải canvas → panel trượt vào, canvas thu hẹp.
2. Cross-board drop: kéo note trên canvas cha thả lên Board tile → note biến khỏi canvas. Vào board đích → note ở top Unsort.
3. Trong Unsort ≥ 3 items → drag item dưới lên top → shift preview, thả → thứ tự cập nhật + F5 persist.
4. Drag item từ Unsort ra canvas trống → item hiện tại drop point.
5. Drag item từ Unsort board A ra Board tile B trong A → item chuyển vào Unsort board B.
6. Chọn note canvas → Ctrl+Shift+U → note biến, Unsort có note top. Undo → về canvas.
7. Chọn item Unsort → Delete → biến. Undo → về.

## Nested Boards — SHIP 2026-09-18 (session này)

Spec: `.kiro/specs/canvas-nested-boards/` — full 12 tasks / 6 phase done. Build + lint pass.

### Schema thay đổi (types.ts)
- `Board.color: string` default `#71717a` (default Zod nên board cũ hydrate OK, không migrate).
- `boardDataSchema` cho object type `'board'`: chỉ chứa `linkedBoardId: string` (ref sang Board entity).
- `BOARD_COLOR_PALETTE` (6 màu Milanote-inspired: zinc/tan/coral/sage/sky/rose) + `boardColorForIndex(i)`.

### Files mới
- `store/boards-store.ts` — Zustand Map<id, Board>. Bootstrap hydrate, mutation qua actions.
- `store/current-board-store.ts` — currentBoardId (null = root). Route sync từ URL param.
- `lib/slug.ts` — `boardSlug(name)` slugify tên (strip dấu tiếng Việt, lowercase-dash).
- `hooks/useBoardSync.ts` — theo dõi currentBoardId → flush persist, hydrate camera, load objects, update persist callback.
- `components/objects/BoardObject.tsx` — tile: icon vuông solid Board.color + title editable + "N cards" + hover ring drop. `data-board-tile-id` attr cho hit-test cross-board drop.

### Files sửa
- `api.ts` — interface + IDB: `deleteBoard(id)`, `deleteObjectsByBoard(boardId)` (batch cho cascade).
- `engine/actions.ts` — thêm: `createBoardAt` (compound Board entity + BoardObject, color rotate qua sibling count), `renameBoard`, `moveObjectsToBoard` (cross-board drop, revert geometry local + push snapshot undo), `deleteBoardCascade` (recursive descendants), `countBoardTreeSize` (async count từ IDB).
- `store/objects-store.ts` — thêm `updateBoardId(id, boardId)`.
- `store/interaction-store.ts` — thêm `hoveredBoardTileId` (BoardObject subscribe cho ring highlight khi drop).
- `hooks/useCanvasBootstrap.ts` — chỉ load boards + set state ready. Objects/camera đẩy sang useBoardSync.
- `route.tsx` — useParams, sync currentBoardId, redirect canonical `/canvas` khi paste rootId trong URL, redirect invalid.
- `App.tsx` — thêm 2 route `/canvas/:boardId` + `/canvas/:boardId/:slug`.
- `components/CanvasHeader.tsx` — Breadcrumb walk ancestry `useBoardsStore`, collapse ≥4 segments; TitleEditable Row 2 double-click rename + URL slug replace.
- `components/Toolbar.tsx` — Board tile → real (`createBoardAt`), remove khỏi PLACEHOLDER, thêm mapping REGISTRY_TO_TILE.
- `components/CanvasApp.tsx` — Delete flow branch: Board object → cascade dialog với count, non-board → simple confirm.
- `hooks/useObjectDrag.ts` — thêm `hoveredBoardTileRef`, hit-test BoardObject qua `data-board-tile-id`, drop → revert geometry + `moveObjectsToBoard`.

### Convention giữ nguyên
- Root board: `parentId=null`, `boardId=null` cho object trên root. KHÔNG migrate. Root persist camera qua rootBoard.id thực trong IDB.
- Count trên tile = shallow (direct children boardId match). Deep count chỉ compute khi dialog delete.
- Move cross-board KHÔNG recenter object (Milanote parity — object giữ nguyên geometry, user tìm được ở nơi họ để).

### Gotcha thêm
- **objects-store chỉ hold current view** — sau nested-boards. Cascade delete + move cross-board phải query IDB cho snapshot đủ, không dựa vào store.
- **Persist callback đổi mỗi khi navigate** — useBoardSync flush + set lại. Tránh camera board A leak sang board B.
- **Board tile double-click ICON** (không phải title) → navigate. Title double-click bubble qua ObjectsLayer → editingId → renderer show editor. Kiểm bằng `e.stopPropagation()` trên icon handler.
- **Ancestry chain có seen guard** (`Set<string>`) trong Breadcrumb để tránh vòng cycle nếu data lỗi.

## Z-index tokens + Object stacking — SHIP 2026-09-20

### Phase 1 — Z-index tokens (screen overlay)
Không tạo file JS mới (user chọn hướng A). Refactor hardcode z-index còn sót sang
hệ token Tailwind/CSS-var ĐÃ CÓ trong bibo. Nguồn duy nhất: `src/styles/index.css`
`--z-*` + `tailwind.config.ts` map class `z-{name}`.

Token có sẵn (không phải Kiro tạo mới):
- world-space: `--z-canvas` 100, `--z-canvas-object` 300, `--z-canvas-selection` 500, `--z-canvas-drag-preview` 700
- screen-space: `--z-toolbar` 20000, `--z-header` 30000, `--z-drag-layer` 40000, `--z-modal` 50000, `--z-tooltip` 60000

Files sửa:
- `Toolbar.tsx` — `z-20` → `z-toolbar`.
- `UnsortPanel.tsx` — UnsortToggle `z-20` → `z-toolbar`; UnsortDragPreview `zIndex: 9999` → `zIndex: 'var(--z-drag-layer)'`.
- `useToolbarDrag.ts` — ghost `zIndex = '9999'` → `= 'var(--z-drag-layer)'`.
- `ContextMenu.tsx` — `z-50` → `z-modal`.
- `ConfirmDialog.tsx` — `z-50` → `z-modal`.

Doc: `.kiro/notes/z-index-tiers.md` — bảng tiers + rule không hardcode + 2 lớp
(world vs screen) không nhầm. Drag ghost dùng `--z-drag-layer` (40000, screen)
KHÔNG phải `--z-canvas-drag-preview` (700, world) vì ghost phải nổi trên toolbar/header.

Registry động (z-index theo thứ tự mở) DEFER tới khi có multi-modal case.

### Phase 2 — Canvas object stacking (Layer 1, world-space geometry.zIndex)
Item chồng item trong board qua `CanvasObject.geometry.zIndex`. Khác hẳn Phase 1
(CSS z-index screen). Không compete (khác stacking context).

Files sửa:
- `engine/actions.ts`:
  - Helper `boardCanvasObjects(boardId)` — object canvas (unsortIndex null) cùng board.
  - Helper `getMaxZIndex(boardId)` — max zIndex, board rỗng → -1.
  - `createObjectAt` + `createBoardAt`: auto `zIndex = getMaxZIndex + 1` khi tạo (bỏ zIndex trong defaultGeometry, luôn 0) → item mới luôn top.
  - Actions mới (undo-able): `bringToFront`, `sendToBack` (max+1 / min-1), `bringForward`, `sendBackward` (swap với neighbor kế cận). Helper `pushZIndexChange` + `swapZIndex` gộp undo entry.
- `ObjectsLayer.tsx`: sort objects theo `geometry.zIndex` ascending trước map render (DOM order khớp stacking, paint order ổn định).
- `useObjectDrag.ts`: `startDrag` gọi `bringToFront(primaryId)` → item cầm lên luôn top (Milanote parity). Push undo riêng, độc lập move. Chỉ khi drag thật (vượt threshold), không khi chỉ click.
- `useCanvasKeys.ts`: shortcut Ctrl+] bringForward, Ctrl+[ sendBackward, Ctrl+Shift+] bringToFront, Ctrl+Shift+[ sendToBack. Áp cho mọi object đang chọn. `mod = ctrlKey || metaKey` (Mac parity).

Gotcha:
- `startDrag` vẫn set `el.style.zIndex = '9999'` DOM inline — đó là SCREEN lift trick tạm thời trong lúc drag (cleanup reset), KHÁC geometry.zIndex. Đừng nhầm.
- bringToFront skip nếu chỉ 1 object trong board (luôn top rồi) hoặc đã đúng top → không tạo undo entry thừa.
- Object trong Unsort (unsortIndex !== null) không tham gia stacking — mọi action guard `unsortIndex === null`.

Verify: build pass 16.5s, lint 0 error (9 warning cũ: 8 react-refresh + 1 unused eslint-disable ở CanvasSurface.tsx:130, đều có sẵn từ trước, không do Phase 1/2).

Note: bibo KHÔNG có `.kiro/status/` — bộ steering bibo (core.md, mode-*.md) không dùng
last-build.json / task-log.jsonl. Đó là rule donor bibo-hub lẫn context, không áp bibo.

### Fix follow-up (2026-09-20) — drag object canvas: floating preview
Bug: kéo item canvas về phía Unsort tab/panel, item bị `overflow-hidden` cột canvas
CẮT ở mép + z-index thấp hơn tab (z-toolbar 20000) → không phủ lên tab/panel được.

Thử z-index (nâng source, rồi nâng world wrapper lên --z-drag-layer) KHÔNG đủ: overflow
clip cắt item, z-index chỉ lo "che" không lo "cắt". Đã revert hướng z-index.

Fix cuối (Paradigm 2 floating preview) trong `useObjectDrag.ts`:
- `startDrag`: object thật `visibility:hidden` (vẫn move ngầm → drop logic + edge-pan
  đọc geometry đúng). Clone `primaryEl.cloneNode(true)` → portal ra `body`, `position:fixed`,
  size = getBoundingClientRect (đã gồm zoom), `z-index: var(--z-drag-layer)`. Screen-space
  → không bị overflow cột canvas cắt, phủ lên Unsort tab + panel + mọi overlay.
- `positionPreview()`: update `transform = translate3d` DOM-direct mỗi frame (không React
  re-render, không rAF thừa). `lastClientRef` set TRƯỚC startDrag để grab offset preview đúng.
- `cleanup`: remove clone + restore `visibility`.
- Dim invalid: set opacity trên preview clone (source đã ẩn).
- Multi-select: chỉ clone primary; item khác cũng hidden (motion-rules: preview chỉ item chính).

Performance: clone 1 lần lúc startDrag, mỗi frame chỉ đổi transform 1 element (GPU composited).
Không subscribe store cho preview. `elementFromPoint` trong updateZone giữ nguyên (có từ trước).

`camera-engine.ts` `getWrapper()` giữ lại (không dùng nữa sau khi bỏ hướng z-index, nhưng vô hại — public method có thể dùng sau).

Fix trước đó (pointerEvents none trên source) vẫn giữ nguyên ý nghĩa: giờ source hidden nên
hit-test tự nhìn xuyên; nhưng clone preview cũng set pointerEvents none để elementFromPoint
không trả về clone.

### Follow-up 2 (2026-09-20) — bỏ clone, "cầm chính item lên" (Milanote parity)
User feedback: clone (cloneNode(true)) vỡ layout, xấu. Refactor bỏ hẳn clone, cầm item gốc trực tiếp.

**Rào cản đã giải quyết**:
- Cột canvas trước có `overflow-hidden` → item bị cắt khi qua vùng panel.
- World wrapper có transform → stacking context riêng, item không vượt được z-index overlay.

**Refactor**:
- `CanvasApp.tsx`: bỏ grid `1fr 260px|0px`, dùng `flex flex-1` cho canvas full width. UnsortPanel
  chuyển thành overlay `absolute right-0 top-0 h-full w-[260px] z-toolbar`, slide qua translateX.
  Content canvas dưới panel bị che khi mở panel (Milanote parity thuần).
- `useObjectDrag.ts` `startDrag`:
  - Bỏ clone preview + `visibility:hidden` source.
  - Nâng `wrapper.style.zIndex = 'var(--z-drag-layer)'` → cả world layer vượt z-toolbar
    (panel/tab/toolbar) ở cấp screen. Wrapper transform tạo stacking context riêng nên phải
    nâng ở cấp wrapper mới vượt được overlay cha.
  - Source elements: shadow lift + `zIndex: var(--z-drag-layer)` (trong world) + `pointer-events:none`
    (hit-test nhìn xuyên xuống drop target).
- `SelectionLayer.tsx`: bỏ ẩn khi drag — giờ item gốc chạy thật, viền theo đúng.
- Simplify: extract `revertToBefore()` + `finishDrag()` gom boilerplate 4 drop path.

**Kết quả**: item cầm trực tiếp, size khớp zoom (vẫn trong world layer scale theo camera), không
vỡ layout, phủ lên panel/tab/toolbar/header. Selection viền theo đúng item.

### Follow-up 3 (2026-09-20) — default size khớp Milanote thật
User đưa DOM Milanote thật:
- Note width 338px (height dynamic 68 → auto khi có body).
- Board 98x139.

Áp:
- `NoteObject.tsx`: default 240x200 → 200x180 → **338x180** (height fixed 180 vì bibo chưa hỗ trợ
  auto-grow, thêm mục backlog `Note auto-grow height`).
- `BoardObject.tsx`: default 100x120 → **98x139**.
- Cập nhật `canvas-object-type-defaults.md` bảng size.
- Cập nhật `canvas-backlog.md` thêm mục Note auto-grow.

Object cũ giữ size cũ (không migrate). Chỉ note/board mới tạo dùng size mới.

MCP note: bibo KHÔNG có `.kiro/settings/mcp.json` (rule đó của donor). Chrome DevTools tools
dùng trực tiếp, không cần config. Từ giờ Kiro hỏi user trước khi bật MCP.

## Next feature (sau nested-boards) — LỖI THỜI, xem "Việc còn mở" cuối file

- **Object types**: Image (blob IndexedDB, paste/drop/menu) → Link (fetch metadata) → To-do. Xem backlog.
- **Task B (đã defer)**: Rail 56px + Workspace overlay (mockup 04). Chỉ có value khi bibo có ≥ 2 tool.
- **Task C**: Unsort panel phải.
- **Alignment guides** (backlog #2).
- **QuickLine full feature** (backlog #1).

LƯU Ý: user reject 2 lần khi Kiro tự dựng Sidebar 232px / layout grid. Toolbar giữ dọc overlay. Workspace/Rail là feature riêng (Task B), KHÔNG tự refactor layout khi chỉ được yêu cầu thêm tile.

## Build/lint status (ghi lúc nested-boards, LỖI THỜI)

- `npm run build` pass 10s (nested-boards).
- `npm run lint`: 0 errors, 7 warnings (react-refresh only-export-components — 5 cũ + 2 mới từ BoardObject cùng pattern, non-blocking).
- Đã `git init` từ trước, chưa commit lần nào (user tự commit).


## Session 2026-09-21 — Unified drag + Toolbar element mode + Note Tiptap + CardClipper

### Unified drag visualize (3 case đồng bộ)

Bug ban đầu: canvas item drag in-place bị header/toolbar/panel che (nằm trong world wrapper
transform stacking context + surface overflow-hidden). Toolbar/Unsort drag portal body bay đẹp,
canvas drag không bay.

Fix: **canvas drag CŨNG dùng FloatingObjectPreview** portal body.
- `store/canvas-drag-store.ts` (mới) — Zustand mirror useUnsortStore. `{ primaryId, clientX/Y,
  grabOffsetX/Y, dim }`.
- `components/CanvasObjectDragPreview.tsx` (mới) — subscribe store, mount trong CanvasSurface.
- `hooks/useObjectDrag.ts` — bỏ in-place lift (transform/boxShadow/zIndex), thay bằng
  `visibility:hidden` tất cả selected + set canvas-drag-store. Preview mount qua store.
- `lib/hit-test.ts` — thêm `isInvalidZone(zone)` helper (overlay/outside = invalid). 3 hook drag
  (canvas/toolbar/unsort) dùng chung → cursor block feedback nhất quán.
- `hooks/useToolbarDrag.tsx` — fix import path bẩn (5-level up), dùng `isInvalidZone`.
- `hooks/useUnsortDrag.ts` — dùng `isInvalidZone`.

Rule cứng (đã note trong handoff mục "Gotcha cần nhớ"):
- **Card selected LUÔN có viền**, kể cả preview drag. `FloatingObjectPreview` có prop `selected`
  → canvas + unsort pass true, toolbar false.
- **SelectionLayer hide khi mode='dragging'** để tránh viền đôi (world scale + screen-space).

### Fix bugs kèm theo

- **Marquee canvas leak Unsort items**: `usePointerInteraction.ts` marquee commit iterate all
  objects → Unsort item geometry (x=0,y=0 hoặc default) trong rectangle → bị hit → select all.
  Fix: filter `unsortIndex === null` khi marquee.
- **SelectionBox bị object card che**: SelectionBox không set zIndex → default auto (0). Item
  container `zIndex: obj.geometry.zIndex` (100+ sau stacking system) → item card render lên trên.
  Fix: `SelectionLayer.tsx` SelectionBox thêm `zIndex: var(--z-canvas-selection)` (500).

### Ctrl-zoom override (rule global)

RULE CỨNG: mọi Ctrl-zoom (wheel + keyboard) nhắm CANVAS, không được để browser zoom trang.

- `hooks/useCanvasKeys.ts` — thêm `Ctrl+=/Ctrl++` (zoom in), `Ctrl+-` (zoom out), `Ctrl+0`
  (reset view). Gọi `engine.zoomImpulse` với anchor center viewport. preventDefault chặn
  browser page zoom shortcut.
- `App.tsx` — window listener `wheel` với `capture:true` + `passive:false` + `preventDefault`
  khi `ctrlKey`. Chặn trackpad pinch (wheel+ctrlKey) trên MỌI page (Landing/canvas/...) →
  browser không zoom trang. Canvas surface có element listener riêng chạy song song → canvas
  zoom camera vẫn work.
- Toolbar canvas wheel `stopPropagation` — trước đó chặn bubble tới surface. Với global capture
  listener, browser page zoom vẫn bị chặn qua capture path bất kể stopPropagation.

### Toolbar 2 mode (creation ↔ element-selected)

Milanote parity: khi select 1 object → toolbar switch từ 8 tile creation → 5 contextual action.

- `components/Toolbar.tsx` — thêm mode detection `selectedIds.size === 1`.
  - **Creation mode**: 8 tile Note/Board/Link/Image/... (nguyên trạng, h-12 w-12 tile).
  - **Element mode**: `DismissButton` (arrow-left, click clear selection về creation) + 5
    `ActionButton` (Color/Labels/Reactions/Comment/More, h-10 w-10 compact, không label
    under icon) + Trash footer.
- Height **cố định** `h-[calc(100vh-8rem)]` cho cả 2 mode (không co theo content). List
  container `flex-1` fill space, Trash footer sticky bottom. Center vertical `top-1/2
  -translate-y-1/2`.
- **Color** (mode element cho Note): `ColorButton` state open + `ColorPopup` grid 2x3 swatch
  + Clear. Popup absolute `left-full ml-2 top-0`. Palette 6 hex ở `lib/note-colors.ts`.
- Labels/Reactions/Comment/More: **placeholder** click no-op, chờ Phase sau (cần label
  management global, comment thread UI, user context).

### Note refactor sang Tiptap (Milanote parity rich text)

- Install: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`.
  Route chunk +~400kb → ~570kb (chấp nhận, canvas là core tool).
- **Schema đổi**: `NoteData` drop `title` field. `body: string` chứa **HTML** (Tiptap
  `.getHTML()`). Default `<p></p>`. `color: string | null` giữ.
- `lib/note-data.ts` (mới) — `parseNoteData(rawData)`: migrate legacy shape (title + body plain
  text với `\n`) → HTML (`<h1>title</h1><p>line</p>...`). Idempotent — HTML shape mới passthrough.
- `objects/NoteObject.tsx`: rewrite dùng `useEditor` + StarterKit + Placeholder. `NoteView`
  render `dangerouslySetInnerHTML`. `NOTE_CONTENT_CLASS` shared cho view + editor (Tailwind
  arbitrary variants `[&_p]:font-serif [&_h1]:font-bold ...`).
- `styles/index.css` — placeholder CSS `.tiptap p.is-editor-empty:first-child::before` với
  `content: attr(data-placeholder)`.
- `components/UnsortItem.tsx::getName` — extract text từ HTML body qua DOMParser (h1/h2/h3/p đầu).
- `components/Toolbar.tsx::ColorButton` — fallback data không có title (spread match schema mới).

### Note auto-grow height (content-driven)

- Milanote parity: Note width fixed, height = content actual (không hard-code lines).
- `NoteObject.tsx::syncHeightToContent` — measure `scrollHeight` element content + cộng
  `NOTE_VERTICAL_PADDING` (40 = p-5 20×2) → target height. Gọi `applyResize({ height })` khi
  diff >1px. `applyResize` silent (không push undo — auto-grow là visual, không phải user action).
  Min 68 (Milanote parity 1 dòng).
- **ResizeObserver** trên Tiptap ProseMirror DOM (editor mode) hoặc content div (view mode).
  Fire mọi layout change: content update, text wrap khi width thay đổi, font load reflow, undo
  Tiptap history. **KHÔNG dùng `editor.on('update')`** vì miss case wrap-do-width-change (không
  phải doc transaction). RO catch mọi layout → 1 mechanism thống nhất.
- 6 điểm behavior (user confirm):
  1. Enter tạo `<p>` mới → cao lên.
  2. Text wrap khi Note hẹp → cao lên (RO catch).
  3. Xoá paragraph/text → co lại (RO catch).
  4. User resize width → wrap khác → recalc.
  5. Undo/redo → data revert → re-render → RO sync.
  6. Note mới chỉ 1 paragraph rỗng (`<p></p>`), KHÔNG title/heading default.

### Note resize width-only (Milanote parity)

- Registry `ObjectTypeDefinition` thêm field `resizeMode?: 'both' | 'width-only'`. Default 'both'.
- Note register `resizeMode: 'width-only'`. Board/Image/... không set → 'both'.
- `components/SelectionLayer.tsx::CornerResizeHandle` — lookup `getObjectTypeDefinition(start.type)`,
  nếu `resizeMode === 'width-only'` → drag corner chỉ update width, giữ `g0.height`. Height
  auto sync qua RO trong renderer (text wrap khi width nhỏ đi → dòng tăng → RO fire → height
  tăng). User cảm giác drag ngang thấy Note co giãn tự nhiên.

### CardClipper — tách paragraph khỏi Note thành note mới

Milanote feature: hover paragraph trong Note → icon Card bên phải → drag ra canvas → tạo Note
mới với content = paragraph đó. Cut default (source Note mất paragraph), Alt = Copy.

- `lib/note-clip.ts` (mới) — `parseBodyChildren` / `countParagraphs` / `extractParagraphHtml` /
  `removeParagraphAt`. Dùng `<template>` để parse an toàn.
- `engine/actions.ts::clipParagraphToNewNote` — composite action. Extract paragraph, create Note
  mới (body = paragraph, color inherit source), update source data (nếu cut). Push 1 history
  entry `apply/revert` cả 2 → undo 1 lần revert cả create + cut.
- `hooks/useCardClipper.ts` (mới) — hover detection. Return `{ index, top }` để render button.
  Track `wrapperRef` (outer) + `contentRootRef` (Tiptap DOM hoặc content div). `pointermove`
  trong wrapper → `elementFromPoint` → tìm block-level ancestor mà parent = root → index +
  Y position relative wrapper. Guard `data-card-clipper-button` để không reset khi hover button.
- `components/CardClipperButton.tsx` (mới) — icon Card SVG 20x24 trong button 24x24, absolute
  `right: -32px` top: dynamic. Drag pattern reuse `useToolbarDrag`-like. FloatingObjectPreview
  render mock note. Drop canvas → `clipParagraphToNewNote(cut = !e.altKey)`.
- `NoteObject.tsx` integrate view + editor mode: mỗi mode có `wrapperRef` + `contentRootRef` +
  `useCardClipper` hook + conditional render `<CardClipperButton>`. Editor mode track
  `currentBody` state qua `onUpdate` để paragraph mới gõ có thể clip ngay.

### Điều chỉnh padding Note

- User feedback: `pt-6 pb-5` (24/20) lệch top/bottom. Đổi `p-5` (20 đều 4 cạnh) — Note không
  có header nên không cần chừa nhiều top. NOTE_VERTICAL_PADDING 44 → 40.
- **Còn chưa ưng** (session này chưa fine-tune xong, defer sang session sau). User có thể
  muốn: tăng padding đều `p-6` (24), hoặc điều chỉnh line-height, hoặc thay đổi font size.

## Trạng thái build cuối session (2026-09-21)

- `npm run build` pass ~14s.
- Route chunk 571kb (Tiptap +~400kb). Warning "chunks larger than 500kB" non-blocking. Có thể
  lazy chunk Tiptap sau (backlog).
- 9 lint warnings cũ non-blocking (react-refresh only-export-components + unused eslint-disable).

## Files mới trong session này

```
src/tools/canvas/
  store/canvas-drag-store.ts        — canvas drag preview state
  lib/note-data.ts                  — parseNoteData migration + schema helper
  lib/note-clip.ts                  — extract/remove paragraph HTML
  lib/note-colors.ts                — palette 6 hex Milanote parity
  hooks/useCardClipper.ts           — hover detection paragraph
  components/CanvasObjectDragPreview.tsx  — subscribe canvas-drag-store
  components/CardClipperButton.tsx  — icon + drag pattern
```

## Rule cứng session này

- **Ctrl-zoom (wheel + keyboard) TUYỆT ĐỐI override browser page zoom**. Global window listener
  capture phase preventDefault trong `App.tsx`. Trackpad pinch chặn toàn app trừ canvas surface.
- **Note = Tiptap rich text HTML**, KHÔNG plain text + `\n` split. Schema `body: HTML string`.
- **Note auto-grow theo content**, không hard-code lines. Height = `scrollHeight + NOTE_VERTICAL_PADDING`.
  Min 68 (Milanote parity). Không set fixed height cho Note.
- **CardClipper feature** — tồn tại trong cả view + editor mode. Cut default, Alt = Copy.
  Composite history 1 undo entry.
- ~~Resize mode per-type qua registry `resizeMode`, Note = 'width-only'~~ (đã thay ở 2026-09-22:
  Note kéo cả 2 chiều + `heightMode`. Field `resizeMode` xoá 2026-09-23 vì không còn type nào dùng).

## Việc dang dở (cập nhật 2026-09-23)

- ~~Padding Note~~ — chốt `px-5 py-6` ngày 2026-09-22.
- ~~Text-selected toolbar mode 3~~ — xong 2026-09-23 (xem mục cuối).
- **Element mode toolbar**: Labels / Reactions / Comment / More vẫn placeholder (chỉ Color chạy).
  Cần hệ thống nền (quản lý label, luồng comment, user context).
- **Lazy chunk Tiptap** — route chunk ~583kb, xem backlog.

## Session 2026-09-22 — Note heightMode + caret + toolbar 3 mode theo type

### Note
- `types.ts` `noteDataSchema` thêm `heightMode: 'auto' | 'fixed'` (default 'auto').
  - 'auto': RO grow-only (`syncHeightToContent`), không tự co lại dưới height hiện tại.
  - 'fixed': user đã kéo corner → giữ height, content vượt thì clip + `FadeOverlay`
    (gradient trong suốt → `var(--card)` ở đáy, bật qua `useContentOverflow`).
- Kéo corner đổi cả 2 chiều. Registry thêm `onResizeCommit(objectId, before, after)`;
  SelectionLayer gọi sau `commitResize` nếu geometry đổi. Note dùng để chuyển 'auto' → 'fixed'.
- Padding chốt `px-5 py-6`, `NOTE_VERTICAL_PADDING = 48`, `NOTE_MIN_HEIGHT = 68`, mặc định 338x68.
  Wrapper `overflow-visible` để CardClipperButton (right:-32px) không bị cắt; div bên trong
  `overflow-hidden` chỉ khi fixed.
- `NOTE_CONTENT_CLASS` thêm `break-words whitespace-pre-wrap` (view mode khớp editor),
  `p+p` cách 10px, viền mờ `outline-primary/40` từng paragraph.
- Caret đúng chỗ double-click: `interaction-store.editingClickPoint` (ObjectsLayer truyền
  clientX/Y), NoteEditor mount đọc 1 lần → `editor.view.posAtCoords` → `setTextSelection`.
  Không có điểm (VD Enter) → `focus('end')`.
- `usePointerInteraction`: đang edit mà pointerdown surface → return sớm, để browser blur editor
  (đường commit đã chạy ổn).

### Toolbar theo từng type
- `Toolbar.tsx` 3 mode, ưu tiên editing > element > creation. editing = `editingId` set.
- Registry thêm `renderElementActions(object)` + `renderEditingActions(object)`. Không đăng ký thì
  Toolbar dùng `GenericElementActions` / `GenericEditingActions` (placeholder).
- Note: `components/objects/NoteToolbar.tsx` (`NoteElementActions`, `NoteEditingActions`).
  Thêm type mới = tạo `XxxToolbar.tsx` + đăng ký trong registry, không sửa Toolbar.tsx.
- `ActionButton` export từ Toolbar.tsx để toolbar từng type dùng lại.

### Thoát 2 tầng
- `ObjectsLayer.onEditEnd` CHỈ clear `editingId`, giữ selection. Dismiss lần 1: editing → element
  (note vẫn chọn). Dismiss lần 2: element → creation (bỏ chọn). Escape cùng logic.

## Session 2026-09-23 — Wire Tiptap toolbar + phím tắt Phase 1

### Toolbar editing mode cho Note (6/8 nút chạy)
- `store/note-editor-store.ts`: `activeEditor: Editor | null`. NoteEditor mount set, unmount clear
  (chỉ clear nếu store vẫn trỏ editor đó). Cần vì ObjectsLayer và Toolbar là 2 nhánh song song.
- `NoteEditingActions` subscribe `activeEditor`, re-render qua `editor.on('transaction')`
  (transaction đã gồm thay đổi selection, không cần `selectionUpdate`).
- Bold / Italic / Bulleted / Numbered: `editor.chain().focus().toggleXxx().run()`, highlight qua
  `ActionButton active={editor.isActive(...)}`.
- TextStyle popup 5 mục: Title h1 / Heading h2 / Subheading h3 / Body paragraph / Quote
  (toggleBlockquote). NOTE_CONTENT_CLASS có style h3.
- Link: `@tiptap/extension-link` (openOnClick false, autolink, linkOnPaste, rel noopener).
  Popup input URL + Save / Remove / Cancel. `extendMarkRange('link')` để sửa link cũ không cần bôi
  đen đúng. Save tắt khi selection rỗng và không có link cũ.
- Comment + More vẫn placeholder.

### Rule cứng: toolbar không làm mất trạng thái edit (Milanote parity)
2 lớp, PHẢI giữ khi thêm nút/popup mới:
1. `ActionButton` có `onMouseDown={e => e.preventDefault()}` → focus không rời editor, selection
   text vẫn còn highlight, `onBlur` không fire.
2. Popup có input (Link URL) thì focus buộc phải rời editor → `NoteEditor.onBlur` bỏ qua khi
   `relatedTarget.closest('[data-canvas-overlay]')`. Mọi popup phải gắn `data-canvas-overlay`
   (dùng `<ToolbarPopup>` là có sẵn). Đóng popup xong gọi `editor.chain().focus()` trả focus.
- DismissButton cố ý KHÔNG preventDefault.
- Thiếu 1 trong 2 lớp → click toolbar làm thoát edit, thoát 2 tầng bị dồn thành 1 tầng.

### Popup dùng chung
- `components/ToolbarPopup.tsx`: `<ToolbarPopup ref className>` (positioning left-full ml-2 +
  surface + `data-canvas-overlay`) và `useToolbarPopupClose({ popupRef, anchorLabel, onClose, onRefocus? })`.
- Hook: click ngoài đóng (bỏ qua click chính nút mở, khớp qua `aria-label` = `anchorLabel`).
  Escape bắt ở capture phase + stopPropagation → chỉ đóng popup, KHÔNG lọt xuống useCanvasKeys
  (bỏ chọn) hay NoteEditor (thoát edit). Callback giữ trong ref, listener gắn 1 lần.
- ColorPopup / TextStylePopup / LinkPopup đều dùng. Popup mới của type sau (Priority, Edit URL,
  Alt text...) chỉ viết phần nội dung.

### Phím tắt Phase 1 (`hooks/useCanvasKeys.ts`)
- Ctrl+A: chọn hết object canvas board hiện tại, chỉ khi `activePanel === 'canvas'`.
- Ctrl+C / Ctrl+X: ghi clipboard system (`lib/clipboard.ts`, prefix `canvas-clip:v1:`, payload
  `{ version, objects: ObjectTemplate[] }` giữ toạ độ gốc). X xoá thêm. Bỏ qua item trong Unsort.
  Reset `pasteCounter = 0`.
- Ctrl+V: paste lệch dần. Lần N đặt tại toạ độ gốc + N×16 (`pasteCounter` trong interaction-store).
  Không dùng vị trí chuột. Cross-board OK. Text thường trong clipboard → bỏ qua im lặng.
- Ctrl+D: nhân bản +16/+16.
- Enter: 1 object chọn, chưa edit → vào edit (caret cuối).
- Escape: đang chọn không edit → bỏ chọn (tầng edit do NoteEditor xử).
- `engine/actions.ts`: `duplicateObjects(ids, offset)` + `pasteObjects(templates, offset, boardId)`
  dùng chung `offsetTemplates` + `insertObjectsComposite` (id mới, zIndex từ max+1, selection =
  object mới, 1 undo entry cho cả cụm). `ObjectTemplate` export từ đây.

### activePanel
- `unsort-store.activePanel: 'unsort' | 'canvas' | null`, default 'canvas'. Click panel → 'unsort';
  click surface (`CanvasSurface` pointerdown) hoặc đóng panel / click ngoài panel → 'canvas'.
  Ctrl+A Unsort vẫn ở UnsortPanel.tsx.

### Chọn nhiều
- Shift+click và Ctrl/Cmd+click trên object đều toggle selection. Ctrl+click: `useObjectDrag` gắn
  listener tạm, nhả chuột mà chưa đi quá 5px thì toggle; không stopPropagation nên Ctrl+kéo vẫn
  pan camera như cũ.

### Gotcha
- Ctrl+V đọc clipboard async: `pasteCounter` tăng sau khi đọc xong. Bấm V liên tục rất nhanh vẫn
  ra thứ tự đúng vì mỗi lần `getState()` mới nhất.
- `anchorLabel` của popup khớp qua `aria-label` của nút mở. Đổi label nút thì đổi luôn chỗ này.

### Rule cứng: HTML của Note không được tin (lọc XSS)
- `lib/note-schema.ts`: `NOTE_SCHEMA_EXTENSIONS` (StarterKit + Link) là nguồn chuẩn schema Note.
  Editor dùng list này + Placeholder. `sanitizeNoteHtml(html)` parse HTML qua schema đó rồi xuất
  lại → chỉ còn node/mark/attr hợp lệ; `<script>`, `<img onerror>`, `style`, `onclick`, href
  `javascript:` đều bị bỏ. Parse trên document tách rời (`DOMParser`) nên không chạy gì lúc lọc.
  Có cache theo body (tối đa 300 entry).
- Lọc 2 chỗ: `NoteView` trước `dangerouslySetInnerHTML` (chặn cả data cũ trong IndexedDB) và lúc
  paste qua registry `sanitizePastedData` (data lưu xuống đã sạch).
- `readCanvasClipboard` kiểm từng object: type phải có trong registry, geometry qua
  `geometrySchema`, data qua `sanitizePastedData` của type. Object sai bị bỏ.
- Type mới nào render HTML/URL do user nhập (Link, To-do...) PHẢI đăng ký `sanitizePastedData`
  và không `innerHTML` data thô.
- Đọc text từ HTML (VD `UnsortItem.getName`) dùng `new DOMParser().parseFromString`, KHÔNG dùng
  `div.innerHTML` trên document chính (`<img onerror>` vẫn chạy dù div chưa gắn vào trang).
- Thêm extension Tiptap mới thì thêm vào `NOTE_SCHEMA_EXTENSIONS`, nếu không bộ lọc sẽ xoá node đó
  khỏi view mode.

### Build cuối session
- `npm run build` pass ~22s, route chunk 583kb.
- eslint `src/tools/canvas`: 0 error, 10 warning (react-refresh + 1 eslint-disable thừa ở
  CanvasSurface.tsx), không chặn.

## Session 2026-10-02 — Hút cạnh khi kéo (alignment snap)

Bạn test trên Milanote rồi chốt: chỉ so cùng loại cạnh, KHÔNG vẽ đường gióng, luôn bật (không có phím tắt hút).
Viết mới, không copy donor (`bibo-hub/.../engine/alignment.ts` chỉ dùng tham khảo).

- `engine/alignment.ts` (mới, pure): `computeSnapDelta(moving, others, threshold)` so 3 cặp mỗi trục
  (trái/tâm/phải, trên/tâm/dưới), mỗi trục lấy cặp gần nhất dưới ngưỡng. `unionBounds`. `SNAP_THRESHOLD_PX = 6`.
- `engine/coord.ts`: thêm `visibleCanvasBounds`.
- `hooks/useObjectDrag.ts`:
  - RULE: lúc kéo KHÔNG hút. Card bám chuột mượt. Bản đầu có hút lúc kéo, bạn thấy giật nên bỏ.
  - Chỉ khi thả trên canvas trống: `computeGroupSnap` → `applyMoveDelta` độ khớp → `commitMove` (1 undo entry
    gồm cả vị trí khớp). Thả lên trash/board tile/Unsort/vùng invalid thì không khớp (các nhánh đó return trước).
  - Không bao giờ đặt tự do. Mỗi trục: có cạnh card khác dưới ngưỡng thì khớp cạnh (ưu tiên), không thì khớp
    lưới `SNAP_GRID = 4` canvas-space theo cạnh trái/trên (bạn thử 16, 8 đều thấy nhảy xa, chốt 4).
  - Kéo nhiều card thì khớp theo khung gộp của cả cụm.
  - Ứng viên: object canvas cùng board, không thuộc cụm đang kéo, không nằm trong Unsort, đang hiện trên màn hình.
  - `settleIntoPlace`: card + viền chọn trượt từ chỗ thả vào chỗ khớp, 120ms, thuộc tính CSS `translate` qua
    `el.animate`. Card giữ inline translate ngay lúc thả, viền chọn tìm qua `data-selection-box-id` trong rAF
    (viền mount lại sau khi mode về idle). Tắt khi `prefers-reduced-motion`.
- `SelectionLayer.tsx`: SelectionBox thêm `data-selection-box-id`.
- Ngoài scope: hút khi resize, khi kéo từ toolbar hoặc từ Unsort ra canvas.

Build pass 13s, tsc + eslint 3 file sạch.

### Fix 2026-10-02 — viền chọn cùng lớp với card

Bug bạn báo: card B nằm sau card A, chọn B thì viền xanh + chấm + icon resize của B vẫn nổi trước A.
Nguyên nhân: SelectionLayer là tầng riêng, zIndex cố định `--z-canvas-selection` (500), luôn trên mọi card.
Kèm lỗi ngầm: zIndex card tăng mãi, vượt 500 thì card tự che viền của mình.

Sửa:
- `SelectionLayer.tsx`: bỏ component `SelectionLayer`, chỉ export `SelectionBox({ id, width, height })`, toạ độ
  tương đối với card. Tự subscribe zoom / mode dragging / số lượng chọn. Icon resize chặn double-click.
- `ObjectsLayer.tsx`: `ObjectView` render `<SelectionBox>` bên trong khối card khi selected.
- `CanvasSurface.tsx`: gỡ `<SelectionLayer />`.
- `useObjectDrag.ts`: `settleIntoPlace(els, dx, dy)` chỉ animate card, viền tự theo. Bỏ `data-selection-box-id`.
- RULE CỨNG: 1 item = card + viền + chấm + icon resize, cùng 1 lớp. Không đặt viền ở tầng riêng.
- Token `--z-canvas-selection` không còn chỗ dùng (giữ trong index.css, vô hại).

Đã kiểm trên Chrome DevTools: viền A nằm trong khối A, B che được viền A.
Còn mở: board tile phần ngoài icon/chữ trong suốt → nhìn xuyên thấy viền + icon resize card dưới nhưng bấm
không được (khung trong suốt của card trên vẫn nhận chuột). Chờ bạn chốt: giữ / nền đặc / cho bấm xuyên.
Card cũ có thể có 2 viền chồng (`ring-2` ObjectShell + border SelectionBox) — chưa xử, chờ bạn nhìn.

### Fix 2026-10-02 — viền chọn Board chỉ bọc khối vuông (Milanote parity)

Trước: Board chọn có 2 viền bọc cả tile 98x139 (SelectionBox + `ring-2` ObjectShell bare), có icon resize.

Sửa:
- Registry thêm `ownSelectionFrame?: boolean`. true → ObjectView không vẽ SelectionBox cả card, renderer tự đặt
  `<SelectionBox>` trong phần tử thân. Image/Link sau này dùng lại field này.
- `SelectionBox({ id, resizable?, radius? })`: bỏ width/height, dùng `inset: -border` → bọc đúng phần tử cha, vị trí
  lấy từ layout thật (không hard-code 13/8). `resizable=false` ẩn icon resize. `radius` (CSS) → bo ngoài = radius + border.
  Bỏ nhánh "dragging → null": card nguồn đã `visibility:hidden` nên viền con ẩn theo, còn preview cần viền.
- Board: SelectionBox trong icon 72x72, `resizable={false}`, `radius="var(--radius)"` (khớp `rounded-lg`).
- ObjectShell `bare` bỏ ring + overflow-hidden (type bare tự vẽ viền).
- FloatingObjectPreview: type `ownSelectionFrame` không có shadow cả khung (khung trong suốt lộ hình chữ nhật thừa).
  Preview Board tự có viền quanh khối vuông vì render cùng Renderer.
- Note giữ nguyên: viền cả card + icon resize, preview vẫn dùng `ring-2` ObjectShell.

Còn mở (chưa đụng): tile Board phần trong suốt vẫn nhận chuột; viền đôi Note (`ring-2` + SelectionBox) chờ bạn xác nhận.

### Fix 2026-10-02 — breadcrumb nhiều cấp + URL chỉ id

Lỗi gốc: `createBoardAt` nhận `boardId` hiện tại (root = null) và ghi thẳng vào `Board.parentId` → board cấp 1
cũng `parentId: null` như root. Breadcrumb mất cấp, cấp 1 hiện "Home", màu xoay đếm lẫn root, bootstrap có thể chọn nhầm root.

Sửa:
- `lib/board-tree.ts` (mới): `normalizeBoards` lúc bootstrap. Root = board `parentId: null` tạo sớm nhất. Board `null`
  khác → `parentId = root.id`. Root tên cũ "Home" → "Board". Board đã sửa được lưu lại IDB. `findRootBoardId`.
- `createBoardAt`: `parentId = parentBoardId ?? rootId`. Object trên root vẫn `boardId: null` (quy ước cũ giữ nguyên).
- `makeDefaultBoard` tên "Board".
- Root giữ tên "Home". `normalizeBoards` sửa ngược nếu bản fix lỡ đổi thành "Board".
- Header: bỏ nút mũi tên về trang chủ. Mục root = logo tạm (tròn đen 18px) + tên. Các mục hiện `board.name`.
- URL chỉ id: `/canvas/:id`. Link cũ `/canvas/:id/:slug` redirect về `/canvas/:id`. Đổi tên không sửa URL.
  `lib/slug.ts` không còn chỗ dùng (giữ lại).

Kéo Board tile sang board khác không cập nhật `parentId`: đã sửa 2026-10-05 (xem mục Fix 2026-10-05).

### Fix 2026-10-02 — viền chọn lệch so với khối màu Board

`SelectionBox` đổi từ `inset: -border` + `border` sang `inset: 0` + `box-shadow: 0 0 0 {border}px primary`. Lý do (suy
luận, chưa đo trên trình duyệt): khi zoom ≠ 100% `border = 2/zoom` lẻ, mép trong viền và mép khối màu làm tròn khác nhau →
hở/lệch vài cạnh. Box-shadow mọc từ đúng mép hộp nên khít. Bo góc mặc định đổi sang `calc(var(--radius) - 4px)` (= rounded-sm
canvas-space của card, trước là 6px màn hình). Chấm QuickLine + icon resize bù lại 1 border để giữ vị trí cũ.

### Fix 2026-10-02 — chấm QuickLine bám theo góc bo

Milanote khối vuông nên chấm ở góc hộp nằm đúng trên viền. Bibo bo góc (Board `var(--radius)` 10px, Note 6px) → góc hộp
là khoảng trống ngoài đường cong, chấm lơ lửng. `QuickLineDot` nhận `radius`, đặt tâm lên đường giữa viền tại điểm 45° của
cung: `inset = r - (r + border/2) * 0.70711 - size/2` (CSS calc). Đổi radius (kể cả 0) chấm tự theo.

### 2026-10-02 — Header + breadcrumb

Đã gộp vào mục "Header hiện tại (chốt 2026-10-06)" ở cuối file. Các bản giữa chừng (1 hàng 3 phần, 2 hàng không
title) đã lỗi thời.

## Session 2026-10-05 — Popup tài khoản + modal Cài đặt (bản thử, chưa có spec)

Bạn bảo "làm thử" theo Milanote AccountPopup + `mockups/10-settings.html`. Chưa viết spec `settings`.
- `src/stores/settings-modal-store.ts` (mới): `open`, `section` ('appearance' | 'account'), không persist.
- `src/components/settings/AccountMenu.tsx` (mới): nút avatar tròn trên header (thay nút Settings "sắp có") →
  popup có mũi tên: avatar + "Khách / Chưa đăng nhập" + Cài đặt + Đăng nhập (tắt). Phần 2 báo dữ liệu lưu trên trình duyệt.
- `src/components/settings/SettingsModal.tsx` (mới): modal phủ toàn màn hình, mount 1 lần ở `App.tsx`. Nav trái
  (Giao diện, Tài khoản) + nội dung. Giao diện: theme Tối/Sáng (preview dùng `data-theme` cục bộ, không hard-code màu),
  phong cách Vẽ tay/Phẳng, Font "Sắp có". Esc đóng, trả focus về chỗ cũ.
- RULE: modal mở thì chặn mọi keydown ở window capture (stopPropagation, không preventDefault) để phím canvas
  (Ctrl+Z, Delete, F, 0) không chạy ngầm sau modal.
- Bạn chốt: bỏ nút theme + style khỏi header, chỉ đổi trong Cài đặt. Header phải còn Undo/Redo | avatar.
- Bạn duyệt bản thử. Vỏ 6 mục: Tài khoản, Giao diện, Canvas, Thanh công cụ, Phím tắt, Dữ liệu (`SECTIONS` trong
  `SettingsModal.tsx`). Giao diện chạy thật, Tài khoản chỉ ghi "Khách", 4 mục còn lại là EmptyState "Sắp có".
  Email/thông báo và Ngôn ngữ (Milanote có) tạm không đưa vào. Nội dung từng mục bàn sau, chưa có spec.
- Fix nhích ngang khi chuyển mục: bạn chọn giữ bố cục căn giữa (header tiêu đề + X, khối max-w-4xl giữa màn hình:
  menu 200px | nội dung). Chống co dãn: vùng cuộn `scrollbar-gutter: stable`, khối `w-full`, cột nội dung
  `minmax(0,1fr)`, mục menu đang chọn không đậm hơn. Chuyển mục → `scrollTo(0)` (không remount, giữ focus).
- Quyết định mục Dữ liệu (bạn chọn A):
  - Phase 1 chỉ xem: số board, số object, dung lượng. Vỏ đã có (`DataSection`), số hiện "—", chưa nối IDB.
  - Export chính lâu dài ở backend (sau này IDB chỉ là bản offline, nguồn chuẩn là DB backend). Trước khi export
    phải đồng bộ xong; còn thay đổi chưa đẩy lên thì báo rõ.
  - Export tạm ở frontend chỉ làm khi bạn bắt đầu có board thật mà backend chưa có. Lúc đó mới chốt định dạng file
    có `version`. Lý do chưa làm: cấu trúc Canvas còn đổi (root id, parentId khi kéo board).
- Chưa có: "Theo hệ thống", mục Canvas (grid, zoom), nút reset mặc định, focus trap đầy đủ.

### Fix 2026-10-05 — kéo Board tile sang board khác cập nhật `parentId`

Lỗi gốc: `moveObjectsToUnsort` (đường duy nhất đổi `boardId` cross-board, dùng bởi `useObjectDrag` thả lên tile và
`useUnsortDrag` kéo từ Unsort lên tile) chỉ đổi object, không đổi `Board.parentId` của board mà tile trỏ tới.

Sửa `engine/actions.ts`:
- Trong cụm đang chuyển, tile type `board` → `reparentBoards` gán `parentId = targetBoardId`, persist IDB.
- Undo trả `parentId` cũ (`restoreBoardParents`); redo gọi lại action nên tự reparent lại.
- Chặn tạo vòng: target là chính board đó hoặc board con của nó → bỏ qua cả thao tác.
- Không sửa data cũ đã lệch: board đã kéo trước bản fix vẫn trỏ cha cũ. Kéo lại 1 lần là đúng.
- Bạn đã test và xác nhận chạy đúng (2026-10-05). Bug này đóng, bỏ khỏi danh sách "còn mở" ở mục cuối session 2026-10-02.

### Fix 2026-10-05 — bỏ quy ước `boardId: null` = Home (không spec, bạn duyệt fix thẳng)

Trước: object trên Home lưu `boardId: null`, còn Board Home có id thật → phải đổi `null` ↔ id gốc ở nhiều chỗ
(nguồn của bug breadcrumb 2026-10-02). Giờ `boardId` luôn là id board thật.

- `types.ts`: `canvasObjectSchema.boardId` là `z.string()`.
- Chuyển đổi dữ liệu cũ: `api.ts` thêm `loadLegacyRootObjects()` (đọc object còn `boardId: null`) + type
  `LegacyRootObject`. `lib/board-tree.ts` thêm `migrateRootObjects` (pure), bỏ `findRootBoardId`.
  `useCanvasBootstrap` chạy chuyển đổi sau khi xác định root, trước khi báo ready → lưu IDB, lần sau rỗng.
- `route.tsx`: URL `/canvas` vẫn là Home, nhưng `currentBoardId = paramBoardId ?? rootBoard.id`. Store
  `currentBoardId` null chỉ khi bootstrap chưa xong. `CanvasApp` nhận `currentBoard.id`.
- `useBoardSync`: bỏ `?? rootBoard.id`, chờ có `currentBoardId`.
- `engine/actions.ts`: mọi `boardId: string | null` → `string`. `createBoardAt` dùng thẳng `parentBoardId`.
- Prop `boardId` của CanvasApp / CanvasSurface / Toolbar / UnsortPanel / UnsortToggle là `string`.
  `objects-store.updateBoardId` nhận `string`.
- Chỗ đọc store (có thể null lúc chưa xong): `useCanvasKeys` paste, `useUnsortDrag` reorder, `CardClipperButton`
  → bỏ qua nếu null. Object giả dùng cho preview (toolbar, card clipper) dùng `boardId: ''`.
- Giữ nguyên: `Board.parentId: null` của Home (Home thật sự không có cha), `isRootBoard`, BreadcrumbList.

Build pass, eslint 0 error. Bạn đã test trên trình duyệt (2026-10-05): dữ liệu Home cũ còn đủ, chạy đúng. Đóng.

### 2026-10-05 — Cài đặt: các mục không cần backend (spec `.kiro/specs/settings/`)

Bạn duyệt checklist rồi bảo làm hết phần không cần backend 1 lượt. 5 task đã tick.
- Tách `SettingsModal.tsx`: khung + menu + giữ Tab trong modal (`trapTab`). Khối dùng chung `SettingsBlocks.tsx`
  (Section có `onReset`, Field, Row, OptionCard, Switch, Segmented, SoonBadge). Từng mục ở `settings/sections/`.
- Giao diện: theme thêm "Theo hệ thống". `theme-store` lưu lựa chọn (`ThemePreference`), `useResolvedTheme()` giải ra
  dark/light + nghe máy đổi (`useSyncExternalStore` + matchMedia). App/StyleDemo dùng hook này. Đặt lại → Tối + Vẽ tay.
- Canvas: store mới `src/stores/canvas-settings-store.ts` (key `bibo-canvas-settings`): `showGrid`, `scrollSpeed`
  (Chậm 0.3 / Vừa 0.5 / Nhanh 0.8). `CanvasSurface` ẩn 2 lớp chấm bằng `hidden`, wheel đọc `getState()` mỗi lần cuộn.
  Hút cạnh vẫn luôn bật, không có setting.
- Phím tắt: `ShortcutsSection` danh sách chỉ xem. RULE: thêm/đổi phím ở useCanvasKeys / useDeleteKey /
  usePointerInteraction / CanvasApp thì sửa danh sách này cùng lúc.
- Dữ liệu: `api.ts` thêm `countAll()` (đếm key, không đọc value). `DataSection` dùng `useQuery`, import động
  `@/tools/canvas/api`, dung lượng từ `navigator.storage.estimate` (cả origin). Skeleton lúc chờ, ErrorState khi lỗi.
- Còn ngoài spec: Thanh công cụ (bàn sau), Font (chờ chọn), Tài khoản / Sao lưu / đồng bộ (chờ backend).

Build pass, lint 0 error (11 warning cũ). Chưa test trên trình duyệt lúc ghi.

### 2026-10-05 — Cài đặt thêm Email và thông báo, Ngôn ngữ và vùng (vỏ)

Bạn yêu cầu bổ sung đủ 5 mục Milanote. Thứ tự menu: Tài khoản, Email và thông báo, Giao diện, Ngôn ngữ và vùng,
Thanh công cụ (theo Milanote), rồi Canvas, Phím tắt, Dữ liệu (riêng bibo).
- `sections/NotificationsSection.tsx`: 4 dòng (tóm tắt hoạt động, nhắc tên, mời vào board, tin tức sản phẩm), đều
  "Sắp có". Khi có backend: thành Switch, lưu theo tài khoản (không localStorage).
- `sections/LocalizationSection.tsx`: Ngôn ngữ (Tiếng Việt), Định dạng ngày (dd/mm/yyyy), Ngày đầu tuần (Thứ Hai) —
  hiện giá trị đang dùng + "Chưa đổi được". Đổi ngôn ngữ cần hệ thống dịch = spec riêng; ngày giờ chưa có chỗ hiện.
- Chữ UI còn lẫn Anh ("Fit content", "Undo", "objects", "New Board") — chưa đổi.

### 2026-10-05 — Plan đa ngôn ngữ (chuyển sang session mới)

Bạn quyết làm đa ngôn ngữ ở session riêng, xong quay lại session Cài đặt. Plan: `.kiro/specs/i18n/`
(requirements 5 US, design có 3 câu cần chốt, tasks 7 task / 3 phase). Chưa code gì.
- Session mới bắt đầu bằng: đọc `.kiro/specs/i18n/` → hỏi 3 câu chốt (thư viện hay tự viết; ngôn ngữ lần đầu;
  tên mặc định "Home"/"New Board") → bạn duyệt tasks → Builder.
- Session Cài đặt còn việc khi quay lại: Thanh công cụ (bật/tắt nút), Font (chờ chọn). Tài khoản, Email và
  thông báo, Sao lưu chờ backend. Mục Ngôn ngữ và vùng sẽ được session i18n làm chạy thật (Task 2).

### 2026-10-06 — Kích thước giao diện chạy trên canvas (spec `settings` Task 7)

- `engine/camera-engine.ts`: thêm `scale` (tỉ lệ giao diện). `targetRef/currentRef` giờ lưu zoom HIỆU DỤNG = zoom board × scale,
  nên mọi chỗ đổi toạ độ đọc `getCamera()` (kéo, thả, hút cạnh, chọn vùng, preview, card clipper, lưới, SelectionBox) tự đúng.
  Quy về zoom board: hydrate (× scale), persist IDB (÷ scale), giới hạn zoom (`minEff/maxEff`), nấc + mốc 100% trong `zoomImpulse`,
  `reset`, `setZoom`, `zoomAt`. `fit` clamp theo giới hạn hiệu dụng.
- `setInterfaceScale(next)`: zoom board và x/y giữ nguyên, nội dung phóng quanh gốc toạ độ, vẽ lại ngay, không persist.
  Engine tự subscribe `useInterfaceStore` (cuối file engine).
- Listener nhận thêm `boardZoom`. `camera-store` có field `boardZoom`, `ZoomBadge` đọc field này → đổi kích thước không đổi %.
- `computeDynamicZoomMin(bounds, viewport, scale)` chia fit zoom cho scale. `CanvasSurface` tính lại khi đổi kích thước.
- RULE: chỗ nào cần zoom để đổi toạ độ / kích thước màn hình → `camera.zoom` (hiệu dụng). Chỗ nào hiện % cho người dùng hoặc
  so với hằng ZOOM_* → zoom board. Đọc nhầm sẽ lệch ở mức Nhỏ/Vừa.
- Task 8 (cùng ngày): toolbar trái + panel Unsort phóng theo tỉ lệ bằng `transform: scale` (hit-test, `getBoundingClientRect`
  đều theo transform). Layout bên trong giữ cỡ gốc.
  - `Toolbar.tsx`: khung ngoài `pointer-events-none` lo vị trí + chiều cao màn hình cố định; khung trong mang giao diện +
    `data-canvas-overlay`, cao `100% / tỉ lệ` rồi scale. Popup trong toolbar scale theo.
  - `CanvasApp.tsx`: khung panel rộng `260 × tỉ lệ`, panel bên trong rộng 260, cao `100% / tỉ lệ`, scale từ góc trái trên.
  - `useUnsortDrag.ts`: `ITEM_HEIGHT` (148) + `LIST_OFFSET_TOP` (88) là px layout, nhân tỉ lệ khi so với `clientY`.
    `DropIndicatorLine` dùng px layout bên trong panel nên không phải sửa.
  - `interface-store.ts`: thêm `useInterfaceScale()` (React) + `getInterfaceScale()` (handler).
  - RULE: số đo cứng trong toolbar/Unsort là px layout. So với toạ độ chuột (clientX/Y) thì phải nhân `getInterfaceScale()`.
- Task 9 (cùng ngày, bạn chọn B, khác Milanote): header canvas, menu tài khoản, modal Cài đặt cũng phóng theo tỉ lệ bằng
  CSS `zoom` (không phải transform, để header thấp lại thật). Modal: zoom trên `<header>` + khối nội dung trong vùng cuộn,
  không trên khung `fixed inset-0`. `useBreadcrumbFit` đo khung bằng `getBoundingClientRect` (trước là `clientWidth`,
  không tính zoom → trộn 2 kiểu ẩn sai số cấp).
- Thang đổi (bạn chốt cùng ngày): Nhỏ 0.9 / **Vừa 1 (mặc định)** / Lớn 1.1. Vừa = cỡ canvas như trước khi có setting.
- Chưa test trình duyệt cả Task 7 + 8 + 9.

## Header hiện tại (chốt 2026-10-06) — nguồn chuẩn

Mục này thay mọi mục header cũ trong file (4. Header 2-row, các mục header 2026-10-02). Đường đi: 1 hàng 3 phần →
2 hàng không title → 1 hàng → 2 hàng có hàng tiêu đề theo Milanote (bạn chọn).

`CanvasHeader.tsx` 2 hàng. Cả header `zoom: uiScale` (Kích thước giao diện). Cả 2 hàng `px-2` (8px, ước lượng theo
Milanote `--ui-section-spacing-xxsmall`, chưa đo padding thật).
- Hàng 1 `h-11`: trái = `BreadcrumbList` (`flex-1 min-w-0`). Phải (`shrink-0`) = số object + Undo/Redo + avatar
  (`AccountMenu` → Cài đặt). Theme / phong cách đã chuyển vào modal Cài đặt.
- Hàng 2 `h-12` = `BoardTitleRow.tsx`: trái trạng thái lưu / giữa tên board 18px / phải Chia sẻ + Xuất ▾ + % zoom ▾.
  Trái và phải cùng `flex-1 basis-0` → tên nằm giữa. Luôn hiện; tuỳ chọn ẩn/hiện chờ bạn (specs/settings Task 11).
  - Tên: double-click sửa (Home không sửa), ô sửa không viền, tự giãn theo chữ (span ẩn chung ô grid với input).
  - Chia sẻ: `aria-disabled` + tooltip "Sắp có" (không dùng `disabled` vì mất hover → mất tooltip).

Breadcrumb (`BreadcrumbList.tsx` + `hooks/useBreadcrumbFit.ts`):
- Home = logo tạm tròn đen 18px. Mỗi cấp = ô màu `Board.color` + tên. Mọi mục max-w 300px, cắt "…".
- Mục hiện tại chữ mờ, không phải link, `aria-current="page"`. Cấp cha hover `bg-muted`.
- Rút theo bề rộng thật (lớp đo ẩn + ResizeObserver): ẩn dần cấp giữa từ gần Home thành nút "..." (menu các cấp ẩn).
  Ẩn hết vẫn thiếu → tên hiện tại cắt "…". `computeHiddenCount` pure.
- URL chỉ id `/canvas/:id`; link cũ có slug redirect về id.

Popup (`HeaderPopups.tsx` + `hooks/usePopup.ts`):
- `usePopup()` trả `{ open, ref, close, toggle }`; bấm ngoài / Esc đóng, Esc bắt ở capture nên không lọt xuống canvas
  (canvas dùng Esc bỏ chọn). Dùng chung cho View, Xuất, "..." breadcrumb.
- `HeaderMenu` = nút chữ + mũi tên, tô nền khi mở. Popup canh theo nút (`right-0`). Đã thử neo theo hàng để sát mép
  màn hình rồi hoàn lại — sai ý bạn (thứ cần chỉnh là padding hàng, không phải popup).
- View: thanh zoom thang log `ZOOM_MIN..ZOOM_MAX` theo `boardZoom`, vạch 100%. Nút "Về 100%" ↔ "Vừa nội dung" chạy
  thật. +/-, kéo thanh, Trình chiếu + 3 công tắc = "Sắp có". Phím F / 0 vẫn chạy (menu Fit/Reset cũ đã bỏ).
- Xuất: 3 nhóm (PDF/PNG; Word/Markdown/Text + công tắc board con; tải file) — tất cả "Sắp có". Dòng tải file đếm
  object `image`/`file` (hiện luôn 0).
- `Switch` (SettingsBlocks) có prop `disabled` (aria-disabled, vẫn nhận hover).
- Key i18n: `CANVAS.HEADER.*`, `CANVAS.VIEW_POPUP.*`, `CANVAS.EXPORT_POPUP.*`; "Sắp có" dùng `COMMON.COMING_SOON`.

Trạng thái lưu (`store/save-status-store.ts` + `withSaveTracking` trong `api.ts`):
- Bọc saveBoard / deleteBoard / saveObject / deleteObject / deleteObjectsByBoard. saveCamera KHÔNG tính (pan/zoom lưu
  liên tục → nhiễu). Bọc viết tay từng hàm vì repository là class (spread mất method).
- "Đang lưu…" chỉ hiện nếu ghi > 300ms; "Đã lưu" 2s rồi ẩn; "Lưu lỗi" giữ tới lần lưu thành công sau.

Còn mở:
- Tính năng thật: Chia sẻ (cần backend), Xuất, Trình chiếu, +/- và kéo thanh zoom.
- Task 11: tuỳ chọn ẩn/hiện hàng tiêu đề trong Cài đặt.
- Font app chưa chốt: khai báo `'Plus Jakarta Sans', Inter` nhưng chỉ tải Fraunces → đang hiện Segoe UI. Đang so trong
  `mockups/typography-playground.html` (12 concept A–L + Tự phối, hover hiện tên font).

## Session 2026-10-07 — Phím tắt tập trung (spec `.kiro/specs/shortcuts/`, 6/6 task)

Thay mọi mục phím cũ trong file (useCanvasKeys Phase 1, useDeleteKey, Esc của popup). Nguồn chuẩn giờ là bảng khai báo.

- `src/lib/shortcuts/`: `dispatcher.ts` (1 listener keydown + keyup ở window capture, ngăn xếp lớp, phím giữ, cảnh báo trùng ở dev), `combo.ts` (`matchCombo`, `bindShortcuts`), `format.ts` (`displayCombos` cho Cài đặt), `useShortcutLayer.ts` (`useShortcutLayer`, `useEscapeLayer`, `ESCAPE_COMBO`), `global-shortcuts.ts`.
- `tools/canvas/shortcuts.ts`: `CANVAS_SHORTCUT_DEFS` chỉ dữ liệu, thứ tự = thứ tự trong Cài đặt. Hành động gắn ở: `useCanvasKeys` (phần lớn), `CanvasApp` (Delete, Ctrl+Shift+U, Esc đóng Unsort ở lớp panel), `usePointerInteraction` (Space qua `registerLayer` trong effect), `UnsortPanel` (Ctrl+A lớp panel).
- Overlay: `usePopup`, `useToolbarPopupClose`, `AccountMenu`, `ContextMenu` dùng `useEscapeLayer`. `ConfirmDialog` + `SettingsModal` là lớp chặn (`blocking`).
- `ShortcutsSection` sinh từ `CANVAS_SHORTCUT_DEFS` + `GLOBAL_SHORTCUT_DEFS`, không còn danh sách chép tay.
- Đã xoá: `src/lib/useGlobalShortcuts.ts`, `hooks/useDeleteKey.ts`, `tools/canvas/lib/dom.ts` (dùng `@/lib/dom`).

Hành vi đổi có chủ đích:
- Esc khi popup / context menu / dialog xoá mở: chỉ đóng lớp đó, vùng chọn giữ.
- Dialog xoá mở: Delete, Ctrl+Z, F... không đụng canvas. Enter khi focus ở nút "Huỷ" thì huỷ (trước đây xác nhận).
- Unsort mở + đang chọn: Esc lần 1 đóng panel, lần 2 bỏ chọn. Esc đang sửa note không đóng Unsort nữa.
- Caps Lock không ảnh hưởng phím chữ (Ctrl+A Unsort trước đây hỏng khi bật Caps Lock).
- Ctrl+Shift+[ / ] so bằng phím vật lý (trước so ký tự `[` `]`, giữ Shift ra `{` `}` nên có thể không chạy).
- Ctrl+Delete / Ctrl+Backspace không còn xoá object. Phím toàn app không chạy khi đang giữ Alt.
- Modal Cài đặt không còn chặn React `onKeyDown` bên trong modal (trước stopPropagation mọi phím ở window).

Gotcha:
- Thêm phím = khai báo trong bảng. Cấm `addEventListener('keydown')` trên window/document (rule trong coding-style.md).
- Lớp tool / panel bỏ qua khi đang gõ; lớp overlay chạy cả khi gõ (Esc trong ô URL Link đóng popup).
- `canvas.pan` (Space) `consume: false` để Space vẫn bấm được nút đang focus.

Đã kiểm trên Chrome DevTools (sự kiện phím giả lập): Ctrl+Shift+D, Caps Lock F / Ctrl+A, popup Esc giữ chọn, Unsort Esc 2 tầng, dialog xoá chặn Delete / F, modal chặn Ctrl+Z, bảng Cài đặt 24 dòng đúng thứ tự, cảnh báo trùng. Chưa kiểm bằng bàn phím thật.

### 2026-10-07 — Modal phím tắt (spec `.kiro/specs/shortcuts-modal/`, 3/3 task)

Thay mục "Cài đặt → Phím tắt" ở các mục trên: danh sách phím giờ là modal riêng, không còn trong Cài đặt.

- `src/components/shortcuts/ShortcutsModal.tsx`: modal 2 cột (nhóm trái, danh sách cuộn phải, nhóm đang xem tự tô). Mở bằng Trợ giúp → Phím tắt hoặc phím `/` (lớp global, bấm lại `/` thì đóng, không mở khi Cài đặt đang mở). Lớp overlay chặn. Store `src/stores/shortcuts-modal-store.ts`.
- `ShortcutKeys.tsx`: `Kbd`, `ShortcutWays({ def })`, `WayList`. Dùng cả ở Cài đặt → Giao diện (gợi ý phím). `Kbd` đã chuyển khỏi `SettingsBlocks`.
- `lib/shortcuts`: thêm `display.ways` (mảnh `combo` / `text` / `pointer`), `PointerKind` (wheel, click, double-click, drag, middle-drag), `displayWays`, `comboKeyLabels`, `platform.ts` (`isApplePlatform`). Apple hiện ⌥ ⇧ ⌘ ↩ ⌫, Windows giữ Ctrl Shift Alt. Tooltip / câu mẹo tự theo.
- `tools/canvas/shortcuts.ts`: thêm dòng chỉ hiển thị cho thao tác chuột (chọn thêm, chọn vùng, cuộn ngang, vào board, tách đoạn, Shift+click trong Unsort) và `NOTE_TEXT_SHORTCUT_DEFS` (phím Tiptap + Markdown). Kéo màn hình gộp 3 cách: Ctrl + kéo, giữ Space và kéo, kéo chuột giữa.
- i18n: `SETTINGS.SHORTCUTS.*` → vùng mới `SHORTCUTS.*`. `trapTab` chuyển sang `@/lib/dom` (Cài đặt + modal phím tắt dùng chung).

Đã thử trên Chrome bằng phím thật (CDP): 12 phím định dạng Tiptap, 11 mẫu Markdown, modal (`/`, bấm nhóm, cuộn, Esc, phím canvas bị chặn), giả lập user agent Mac. Không có double-click vùng trống để tạo note → không ghi dòng đó.

Đã sửa cùng ngày:
- Ctrl+Enter thoát sửa note từng lưu kèm 1 `<br>` thừa (Tiptap HardBreak `Mod-Enter` chạy trước). Listener Esc / Ctrl+Enter của NoteEditor giờ gắn ở capture phase trên DOM editor + preventDefault → ProseMirror bỏ qua phím. Shift+Enter vẫn xuống dòng mềm.
- `note-schema.ts`: `StarterKit.configure({ link: false })` + Link cấu hình riêng → hết cảnh báo "Duplicate extension names: link".

### 2026-10-07 (cuối session) — chỉnh modal phím tắt theo Milanote

- Nhóm trong modal theo Milanote: Thường dùng, Cơ bản, Định dạng chữ, Markdown, Di chuyển, Giao diện, Thu phóng (key `SHORTCUTS.GROUP.*`: ESSENTIAL, BASICS, TEXT, MARKDOWN, NAVIGATION, APPEARANCE, ZOOM). Bỏ nhóm cũ EDIT/SELECT/VIEW/LAYER/UNSORT; trong `tools/canvas/shortcuts.ts` các hằng EDIT/SELECT/LAYER/UNSORT giờ đều trỏ BASICS. Chưa có nhóm Drawing (bibo chưa có vẽ tay).
- Cột trái modal `w-max` (ôm vừa nội dung, trước là `w-64` bị thừa ~20px bên phải), câu "Bấm [/] để mở danh sách phím tắt" 1 dòng (`whitespace-nowrap`). Modal rộng tối đa 880px.
- Dấu ngăn giữa các cách bấm là `|` (`OrSeparator` trong `ShortcutKeys.tsx`), trình đọc màn hình đọc "hoặc". Không dùng `/` để khỏi nhầm phím mở modal.
- `ShortcutDisplay.subgroupKey`: tiêu đề con trong nhóm. Markdown chỉ còn 1 tiêu đề con `SHORTCUTS.SUBGROUP.LINE_START` ("Gõ ở đầu dòng mới"). Đã bỏ 4 dòng gõ bao quanh chữ (`**…**`, `*…*`, `~~…~~`, `` `…` ``) cùng key `AROUND_TEXT`: đó là định dạng khi gõ, không phải phím tắt, Milanote cũng không ghi. Tiptap vẫn chạy các mẫu này, chỉ là modal không liệt kê.
- Danh sách số hiện `[1][.]` (2 phím), danh sách chấm chỉ hiện `*`.

- Cột trái modal cố định `w-60` (240px, vừa câu mẹo tiếng Việt) để đổi vi/en không làm 2 cột nhảy.
- Ô tìm trên header modal: mở modal là focus ô tìm (trước là nút X). Lọc theo tên thao tác + tên nhóm + tên phím, mọi từ phải khớp, bỏ dấu ("xoa" khớp "Xoá"). Đang tìm thì ẩn "Thường dùng" (dòng lặp), nhóm không còn kết quả mờ ở cột trái. Esc: có chữ thì xoá chữ, ô trống mới đóng. Vì focus luôn ở ô tìm nên `/` trong modal gõ ra ký tự, không còn đóng modal. Key `SHORTCUTS.SEARCH`, `SEARCH_PLACEHOLDER`, `NO_RESULTS`.

Đang chờ bạn test bằng tay: 27 case spec shortcuts, 5 case ô sửa tên board / URL / bộ gõ, modal phím tắt (`/`, bấm nhóm, cuộn, Esc, giả lập Mac).
Để sau: nút Tìm kiếm và Thông báo trên header vẫn là "Sắp có".
Build pass, tsc + eslint sạch tại thời điểm ghi. Chưa commit.

## Session 2026-10-08/09 — dọn code (chưa test trình duyệt) + note tự lưu

### Dọn code session trước (chưa thử trên trình duyệt)
- Chọn chữ: `select-none` đặt ở gốc vùng (CanvasSurface, UnsortPanel, CanvasHeader, Kbd). Editor note `select-text`.
- Con trỏ 3 tầng: rule disabled trong index.css, `src/lib/cursor-override.ts` (`setCursorOverride`) thay `canvas-drag-invalid` và `style.cursor`.
- Hằng ra lib: `src/lib/focus-ring.ts`, `src/lib/css-token.ts` (`readCssToken`), `isZoomWheel` trong `lib/shortcuts/pointer.ts`.
- Thời gian chuyển động dùng token `duration-fast` / `duration-normal`, Tailwind trỏ biến CSS.
- Định nghĩa object type tách ra `xxx-type.ts(x)`. Phím note chuyển sang Tiptap extension `lib/note-commit-keys.ts`.
- Steering mới `.kiro/steering/shortcuts.md`.

### Note tự lưu + khoá giữa tab + Ctrl+Enter (spec `.kiro/specs/canvas-note-autosave/`, 5/5 task, test tay pass 2026-10-11)

Kiến trúc ghi:
- `lib/write-queue.ts` (pure): 1 lô đang ghi, phần mới gom chờ, cùng id giữ thao tác mới nhất, không debounce.
  Lỗi: giữ lại, dừng, lần enqueue / flush sau thử lại; KHÔNG reject caller (báo `onError`).
  `flush({ urgent: true })`: ghi phần chờ ngay song song (IndexedDB chạy transaction ghi theo thứ tự tạo → vẫn đúng thứ tự).
- `api.ts` `withWriteQueue`: mọi `saveObject` / `deleteObject` / `deleteObjectsByBoard` qua hàng đợi; mỗi lô 1 transaction,
  đóng dấu `version`. `loadObjects` / `loadObject` tính cả phần chưa xuống đĩa. Ghi xong → BroadcastChannel báo tab khác.
  Board vẫn ghi thẳng. Trạng thái lưu đo theo lô.
- `types.ts`: `version` (default 0, chỉ hàng đợi tăng, caller không tự tăng).
- `hooks/useCanvasPersistence.ts` (gắn ở route): ẩn tab / `pagehide` → đẩy gấp; nhận tin tab khác → đọc lại object, cập nhật
  store (bỏ qua object tab này còn chờ ghi hoặc đang sửa); bật khoá sửa. `useBoardSync` chờ `flush` trước khi nạp board mới.

Note:
- Gõ → `setNoteBodySilently` (store + kênh `text`, không undo). Thoát sửa → `commitNoteBodyEdit` đúng 1 bước (chữ lúc vào sửa →
  chữ cuối), không đổi thì không ghi. Undo / redo chỉ đổi chữ. Editor bị gỡ không qua Esc / blur (đổi board...) vẫn ghi bước.
- `startBodyRef` chụp chữ lúc vào sửa: prop `initial` giờ đổi theo store mỗi lần gõ, KHÔNG dùng làm "trước".
- Ctrl/Cmd+Enter (`onCommitAndNew`): thoát sửa + `createNoteBelow` (cùng cạnh trái, cách cạnh dưới 16px, size mặc định) + vào sửa.
  Esc / click ngoài vẫn thoát. `updateObjectData` không còn dùng cho note.

Khoá giữa tab (`lib/edit-locks.ts` + `store/remote-lock-store.ts`). Dòng "Bám `editingId`" dưới đây đã thay ở 2026-10-11: khoá theo mọi object đang CHỌN + đang sửa.
- Bám `editingId`: đổi sang X thì xin Web Lock `bibo-canvas-edit:X` (ifAvailable). Không được → huỷ sửa + `showNotice`.
  Mọi đường vào sửa đều qua đây. Khoá áp cho mọi object vào sửa (board tile đổi tên cũng khoá, vô hại).
- Danh sách khoá của tab khác lấy từ `navigator.locks.query()`, hỏi lại khi có tin `locks`, khi focus, mỗi 3s lúc tab hiện.
- RULE: object khoá ở tab khác KHÔNG vào được vùng chọn (`selection-store` lọc) → không kéo / resize / đổi màu / xoá / Ctrl+X...
  Thao tác mới đụng object mà không qua vùng chọn thì phải tự kiểm `isLockedElsewhere`. Đã chặn thêm: double-click
  (ObjectsLayer), pointerdown (useObjectDrag), nút tách đoạn (NoteView).
- Thông báo ngắn: `store/notice-store.ts` + `components/CanvasNotice.tsx` (giữa mép trên canvas, tự ẩn 2.5s).

Rủi ro đã chấp nhận: undo ở tab B có thể hồi chữ cũ của note tab A vừa sửa (để `canvas-sync` so `version`).
Board (đổi tên, tạo) chưa đồng bộ giữa tab.

Build pass, lint 0 lỗi (1 cảnh báo shadcn cũ). Chưa commit.

### Fix 2026-10-10 sau test thủ công (spec `canvas-note-autosave`)
- Kéo / resize góc: lúc đang kéo CHỈ đổi store (`applyMoveDelta`, `previewResize`), thả mới ghi (`commitMove` / `commitResize`). F5 giữa lúc kéo → về chỗ cũ. Huỷ kéo (pointercancel) và thả vào thùng rác cũng trả về chỗ cũ trước. `applyResize` (ghi ngay) chỉ còn cho note tự cao theo chữ.
- Note: đổi tab làm editor blur → trước đây thoát sửa, nhả khoá, nên tab B sửa được (C2 "không thấy tính năng"). Giờ `onBlur` bỏ qua khi `!document.hasFocus()`.
- Ctrl+Enter khi 1 note đang chọn (chưa sửa) cũng tạo note bên dưới + vào sửa (`canvas.new-note-below` trong `shortcuts.ts`, chạy ở `useCanvasKeys`).
- Lỗi đã biết, CHƯA sửa: mở 2 tab cùng lúc trên dữ liệu trống → mỗi tab bootstrap tạo 1 board "Home", `normalizeBoards` gắn cái sau làm con cái trước → 2 tab ở 2 board khác nhau. Đã thấy khi test bằng MCP (2026-10-10).

### 2026-10-10 — Badge "đang sửa ở tab khác" (Milanote `ElementUserTag` + `remote-selected`)
- `components/RemoteEditBadge.tsx`: object khoá ở tab khác → viền `warning` 2px quanh card + pill đè góc trên phải, lòi ra 14px (avatar icon người + "You"/"Bạn" + nút ×). Pill co giãn theo zoom như note (không bù zoom). Pulse chỉ là box-shadow lan 16px (`tailwind.config.ts`), không scale. Gắn trong `ObjectView` (`ObjectsLayer.tsx`) theo `useRemoteLockStore`. Polish thêm để sau (backlog).
- Nút × = `requestRelease(id)` (`lib/edit-locks.ts`) → tin `release` qua BroadcastChannel → tab đang sửa thoát sửa + bỏ chọn + báo `CANVAS.NOTE_LOCK.TAKEN`, nhả khoá → badge tab kia biến. Chữ không mất (đã tự lưu).
- Viền `warning` để khác viền chọn `primary` của chính mình. Khi có tài khoản (`canvas-sharing`): thay icon + "Tab khác" bằng avatar + tên thật, màu theo người.
- Đã thử bằng MCP 2 tab: badge hiện, × chạy.

### Fix 2026-10-11 — khoá theo người CHỌN + B7
- `lib/edit-locks.ts` viết lại: khoá = mọi object đang CHỌN + đang sửa (Milanote "khoá theo người chọn"), không chỉ đang sửa. Subscribe selection-store + editingId, `sync()` diff xin / nhả. Xin không được → bỏ chọn / huỷ sửa + báo.
- B7 (click vùng trống khi đang sửa → bị bỏ chọn luôn): nguyên nhân là race lúc nhả khoá. `release` xoá khỏi `held` ngay, trình duyệt nhả bất đồng bộ → refresh định kỳ thấy khoá còn mà không phải của mình → coi là tab khác → selection-store tự bỏ chọn. Sửa: set `inFlight` giữ id lúc đang xin / đang nhả, refresh bỏ qua.
- Đã thử MCP 2 tab: tab A chỉ chọn → tab B có badge; tab A sửa rồi thoát → vẫn chọn sau 4.5s.
- Sửa lại B7 (bạn chốt 2026-10-11): đang sửa mà click vùng trống canvas → thoát sửa + BỎ CHỌN (về canvas). `usePointerInteraction` clear selection rồi để editor blur commit. Esc / nút Dismiss vẫn thoát 2 tầng (sửa → chọn → bỏ chọn).

### 2026-10-11 — Đóng spec `canvas-note-autosave`
- Bạn test thủ công pass hết (A1–A10, B1–B7, C1–C10, D1–D7). Spec chuyển "Xong".

## Việc còn mở (nguồn chuẩn, cập nhật 2026-10-12)

ĐÃ CHỐT thứ tự (bạn chốt 2026-10-12): test Task 1-2 `canvas-storage-v2` → Task 3 → service worker mở app khi offline (mục 4 dưới) → rồi mới tới backend (mục 3). Mục 1, 2, 4 đã xong code. VIỆC KẾ: mục 3 (sửa `bibo-foundation` thêm Supabase). Prompt mở session: `.kiro/notes/next-session-prompt.md`. (2026-10-13: mục 3 phần `bibo-foundation` xong, prompt đã đổi sang `bibo-auth`.)

Danh sách việc:
1. Spec `canvas-storage-v2` (đã viết 2026-10-12, chờ duyệt, `.kiro/specs/canvas-storage-v2/`). Chốt: IndexedDB thuần tự bọc, bỏ `idb-keyval`; dữ liệu cũ là test nên KHÔNG chuyển, xoá 2 database cũ; làm luôn khoá khởi động giữa tab (mục 2 dưới). Nội dung gốc: gộp 2 database IndexedDB (`bibo-canvas-boards`, `bibo-canvas-objects`) thành 1 database nhiều store, thêm chỉ mục `boardId` (hiện `loadObjects` quét mọi key), sửa `ObjectsLayer` render lại cả danh sách mỗi lần gõ (subscribe cả Map `objects`). Là nền cho outbox (`milanote-sync-architecture.md` mục 2.5, 2.10).
2. (Đã sửa 2026-10-11 trong `canvas-storage-v2` Task 2, chờ test) Lỗi 2 board "Home".
   `canvas-storage-v2` Task 1-2 xong code: 1 database `bibo-canvas` phiên bản 2 (boards, objects + chỉ mục boardId, cameras), lớp bọc `lib/idb.ts`, đã gỡ `idb-keyval`, bỏ code chuyển đổi dữ liệu cũ. Task 1-2 test pass 2026-10-12. Task 3 (render nhẹ khi gõ) test pass 2026-10-12. Spec `canvas-storage-v2` XONG. Bước tiếp: service worker (mục 4).
3. (VIỆC KẾ) Backend. `bibo-foundation` đã ghi Supabase + `bibo-auth` (2026-10-13). Thứ tự: bạn dựng project theo `docs/supabase-setup.md` → `bibo-auth` → spec `canvas-sync` → `canvas-sharing`. Chia project: hướng A + chuẩn bị cho C (chốt 2026-10-13). Khi viết `canvas-sync` nhớ: cột chủ sở hữu, bảng "board → project", client theo board, gỡ `OfflineBadge`, `onblocked` trong `lib/idb.ts`. Đọc `milanote-sync-architecture.md` trước. Khi làm `canvas-sync`: gỡ nhãn tạm `OfflineBadge` (xem `docs/architecture.md` mục "Mở app khi offline"), chốt "xử lý ngầm" có mâu thuẫn với header 3 trạng thái không, xử `onblocked` trong `lib/idb.ts`.
4. (XONG 2026-10-12, bạn test tay pass) Mở app khi offline: `vite-plugin-pwa` 2.0.0, `src/lib/pwa/`, `UpdateBanner`, `OfflineBadge` (tạm). Kiro đã thử MCP: F5 offline, link board sâu offline, thanh báo bản mới + "Tải lại", dev không có service worker. Chi tiết `docs/architecture.md` mục "Mở app khi offline".

5. (Để sau, bạn chốt 2026-10-12) Cài bibo như app (PWA install): manifest (tên, màu, icon) + bộ icon nhiều cỡ → có icon trên taskbar, mở cửa sổ riêng không thanh địa chỉ. Không liên quan offline. Làm khi có icon chính thức; cần service worker của `app-offline` trước.

Spec còn task mở (không chặn việc trên):
- `canvas-content-objects` Task 5-9: Image + Link.
- `canvas-unsort-multi-select` Task 5-7: kéo nhiều item trong Unsort.
- `i18n` Task 5-7: bạn chuyển nốt chữ cứng, Kiro rà soát.
- `settings` Task 11 (khoan, bạn đang cân nhắc). `shortcuts-modal`: 1 mục. `design-system` Task 9 hoãn.

Chưa xác nhận (trạng thái spec ghi "chờ bạn test"): `canvas-nested-boards`, `canvas-unsort`, `canvas-landing-demo`, `shortcuts` (27 case), `shortcuts-modal`. Bạn xác nhận thì Kiro đổi sang "Xong".

Polish để sau: badge khoá (backlog mục cuối), font app, lazy chunk Tiptap (route chunk ~580kb).

### 2026-10-12 — Ngoài canvas, làm trong cùng session
- Sửa 3 cảnh báo lint "import ngược": thêm `src/register-tools.ts` (file duy nhất nối tool với phần chung), sổ `src/lib/shortcuts/registry.ts`, `src/lib/data-stats.ts`. Luật nâng lên `error`. Lint chỉ còn cảnh báo shadcn `ui/button.tsx`.
- Nhóm "Thường dùng" trong modal phím tắt: phím tự khai `display.essential: <số thứ tự>` trong bảng của tool, modal không giữ id nào.
- Review còn treo (chưa sửa, làm cùng `canvas-sync`): `lib/idb.ts` chưa xử `onblocked` khi nâng phiên bản database; tab cũ bị đóng kết nối thì ghi lỗi tới khi F5. `aria-label` nút Unsort lúc đang tải vẫn đọc "0" (nhỏ).
- Unsort theo từng board là ĐÚNG (bạn kiểm lại), không làm Unsort chung.
