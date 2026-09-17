# Tasks — Canvas Phase A

Mỗi task là 1 verifiable unit. Verify build cuối phase, trong phase dùng kiểm tra kiểu.

Reference donor: `bibo-hub/src/tools/canvas/` (chỉ đọc, không sửa). Đọc code donor để bám pattern, không copy nguyên xi vì phần vỏ UI khác (bibo dùng design system riêng), backend khác (IndexedDB).

## Phase 1 — Foundation (types + repository + store bootstrap)

- [x] Task 1: Data model + Zod schema
  - `src/tools/canvas/types.ts` — port `Geometry`, `CanvasObject`, `Camera`, `Board` từ donor, hằng số ZOOM_MIN/MAX, MIN_OBJECT_SIZE, helper `makeDefaultBoard`, `isRootBoard`.
  - Verify: kiểm tra kiểu sạch, `zod` đã cài (kiểm `npm ls zod`), thêm nếu chưa có.

- [x] Task 2: Repository interface + IndexedDB adapter
  - `src/tools/canvas/api.ts` — interface `CanvasRepository` + class `IndexedDbCanvasRepository` implement dùng `idb-keyval` (nhẹ, đủ dùng). Nếu chưa có thì `npm i idb-keyval`.
  - Method: `loadBoards/saveBoard/loadObjects/saveObject/deleteObject/saveCamera`.
  - Store trong 2 kv-store: `bibo-canvas-boards` + `bibo-canvas-objects`.
  - Comment "TODO Phase D: SupabaseCanvasRepository" ở đầu file.
  - Export `getCanvasRepository()` singleton.
  - Verify: kiểm tra kiểu.

- [x] Task 3: Stores Zustand (camera, objects, selection, interaction)
  - 4 store trong `src/tools/canvas/store/`.
  - camera-store: `{camera, hydrate, pan, zoom, reset, fit}`.
  - objects-store: `{objects: Map, add, update, remove, hydrate}`.
  - selection-store: `{selectedIds: Set, select, toggle, addToSelection, clear}`.
  - interaction-store: `{mode: 'idle' | 'panning' | 'dragging' | 'resizing' | 'marquee', ...}`.
  - Verify: kiểm tra kiểu.

## Phase 2 — Engine cốt lõi (coord + bootstrap + render)

- [x] Task 4: Coord math + hooks pointer/wheel
  - `src/tools/canvas/engine/coord.ts` — hàm `screenToCanvas`, `canvasToScreen`.
  - `src/tools/canvas/hooks/useWheelZoom.ts` — wheel event → zoom quanh cursor.
  - `src/tools/canvas/hooks/usePointerInteraction.ts` — pointer down/move/up dispatch theo interaction mode.
  - Verify: viết test nhỏ cho coord (Vitest), zoom-around-cursor giữ điểm cursor cố định.

- [x] Task 5: Bootstrap + route + CanvasApp shell
  - `src/tools/canvas/hooks/useCanvasBootstrap.ts` — state machine loading → ready | error, load boards + objects khi mount, tạo root board nếu chưa có.
  - `src/tools/canvas/route.tsx` — route `/canvas`, header (Style Button + Badge), CanvasApp mount khi ready.
  - `src/tools/canvas/components/CanvasApp.tsx` — layout khung.
  - `src/tools/canvas/components/CanvasSurface.tsx` — div fullscreen + grid dots background + gắn hook pointer/wheel.
  - `src/tools/canvas/components/Grid.tsx` (hoặc CSS trong Surface).
  - Thêm route vào `src/App.tsx`.
  - Verify: mở `/canvas`, thấy grid dots, pan bằng Space+drag, zoom bằng wheel.

## Phase 3 — Object CRUD + selection + persist

- [x] Task 6: Renderer + context menu tạo rect
  - `src/tools/canvas/components/Renderer.tsx` — render 1 object theo geometry * camera. Phase A chỉ có type='rect' (div bg-primary-soft border-primary).
  - `src/tools/canvas/components/ObjectsLayer.tsx` — map objects → Renderer.
  - `src/tools/canvas/components/ContextMenu.tsx` — Radix DropdownMenu, right-click vùng trống, "Add rect".
  - Command CreateObjectCommand.
  - Verify: right-click → menu, click "Add rect" → rect xuất hiện + được select.

- [x] Task 7: Selection (click, shift+click, marquee) + selection UI
  - Click object → select đơn.
  - Shift+click → toggle multi.
  - Marquee drag vùng trống → select nhiều.
  - `src/tools/canvas/components/SelectionLayer.tsx` — outline + 8 resize handles quanh selection.
  - Verify: các thao tác select hoạt động đúng.

- [x] Task 8: Drag object + Resize
  - usePointerInteraction handle drag mode + resize mode.
  - Command MoveObjectCommand, ResizeObjectCommand.
  - Trong lúc drag: update transform trực tiếp qua ref, không setState mỗi frame. Commit vào store khi mouseup.
  - Min-size 40x40.
  - Verify: kéo object, resize 8 handle đều work; performance không lag.

- [x] Task 9: Xoá object + confirm dialog nếu > 1
  - Phím Delete/Backspace khi có selection và focus không ở input.
  - > 1 object: confirm dialog (Radix Dialog + Style Button).
  - Command DeleteObjectsCommand.
  - Verify: xoá 1/nhiều object, confirm hiện đúng, undo được.

## Phase 4 — Undo/Redo + Camera control + Polish

- [x] Task 10: History store + Command execute qua history
  - `src/tools/canvas/store/history-store.ts` — undo/redo stack, min 50 entry.
  - Mọi command từ Task 6/8/9 push qua history.
  - Ctrl+Z / Ctrl+Shift+Z bindings.
  - Verify: create → undo → object biến mất; move → undo → về vị trí cũ.

- [x] Task 11: Fit view + Reset view
  - `src/tools/canvas/lib/content-bounds.ts` — tính AABB toàn bộ object.
  - Nút Fit trong header + phím F: camera fit content.
  - Nút Reset + phím 0: camera về (0,0) zoom 1x.
  - Verify: có object → Fit → fit đúng; không object → Fit = Reset.

- [x] Task 12: Persist camera + polish
  - Save camera debounce 300ms.
  - Persist qua reload: object + camera hydrate đúng.
  - LoadingState khi bootstrap loading, ErrorState khi lỗi.
  - Verify: reload page → state phục hồi đúng vị trí + zoom.

## Verify cuối Phase A

Sau Task 12: `npm run build` pass, mở `/canvas` thao tác toàn bộ US-1 đến US-13 chạy đúng.

## Ghi chú

- Ước lượng: 12 task chia 4 phase nhỏ. Task 4 (coord + hooks) và Task 7 (selection) là 2 chỗ khó nhất, dễ mất thời gian nhất — đọc kỹ code donor tương ứng khi làm.
- Sau Phase A xong, spec kế tiếp: `canvas-content-objects` (Phase B — Note/Text/Image/Link).
- KHÔNG copy nguyên xi code donor. Đọc để hiểu pattern, viết lại theo convention bibo (design system, TS strict, alias `@/`).
