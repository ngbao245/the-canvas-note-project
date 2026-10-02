# Canvas — Session Handoff

Ghi 2026-09-18, cập nhật tới 2026-09-23 (mục cuối file). Đọc file này để nắm ngữ cảnh canvas thay vì replay lịch sử chat dài. Mục cũ ghi theo thời gian; chỗ nào bị session sau thay thế đã đánh dấu "(đã thay ở ...)".

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
    index.ts (4) — barrel side-effect register
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

## Next feature (sau nested-boards)

- **Object types**: Image (blob IndexedDB, paste/drop/menu) → Link (fetch metadata) → To-do. Xem backlog.
- **Task B (đã defer)**: Rail 56px + Workspace overlay (mockup 04). Chỉ có value khi bibo có ≥ 2 tool.
- **Task C**: Unsort panel phải.
- **Alignment guides** (backlog #2).
- **QuickLine full feature** (backlog #1).

LƯU Ý: user reject 2 lần khi Kiro tự dựng Sidebar 232px / layout grid. Toolbar giữ dọc overlay. Workspace/Rail là feature riêng (Task B), KHÔNG tự refactor layout khi chỉ được yêu cầu thêm tile.

## Build/lint status

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
- Clipboard payload chưa được kiểm tra nội dung (chỉ check version + mảng). Xem backlog
  "paste-sanitize".

### Build cuối session
- `npm run build` pass ~22s, route chunk 583kb.
- eslint `src/tools/canvas`: 0 error, 10 warning (react-refresh + 1 eslint-disable thừa ở
  CanvasSurface.tsx), không chặn.
