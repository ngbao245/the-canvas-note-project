# Task — Canvas Unsort Panel

**Trạng thái**: Đã ship, chờ user manual verify.

## Phase 1: Data model + query

- [x] Task 1: Extend `types.ts` với `unsortIndex: number | null`
  - File: `src/tools/canvas/types.ts`
  - Thêm field vào `canvasObjectSchema` với `.nullable().default(null)`. Cập nhật comment header nói rõ semantics.
  - Verify: `getDiagnostics` clean, object cũ hydrate OK.

- [x] Task 2: Query helpers phân biệt Canvas vs Unsort
  - Files: `src/tools/canvas/store/objects-store.ts` (thêm selector helpers), `src/tools/canvas/components/CanvasSurface.tsx` (filter render).
  - CanvasSurface objects render: chỉ items có `unsortIndex === null`.
  - Selector `selectUnsortItems(boardId)` return items sorted theo `unsortIndex` asc.
  - Selector `selectUnsortCount(boardId)` return số.
  - Verify: tạo object thủ công qua devtools set `unsortIndex=0` → biến khỏi canvas.

## Phase 2: Panel UI

- [x] Task 3: `UnsortPanel.tsx` component + layout grid
  - Files: `src/tools/canvas/components/UnsortPanel.tsx` (mới), `src/tools/canvas/components/CanvasApp.tsx` (mount + grid layout adjust), `src/tools/canvas/components/CanvasSurface.tsx` (accept `unsortOpen` prop hoặc dùng store).
  - Panel: fixed 260px, header + list + hint footer. Placeholder items chưa có (verify layout).
  - Toggle: tab góc phải-trên canvas surface (position absolute).
  - Store `unsort-store.ts` (mới) hold `panelOpen: boolean`.
  - Verify: bấm tab → panel trượt vào, canvas thu hẹp. Bấm X → panel đóng. Grid transition mượt.

- [x] Task 4: `UnsortItem.tsx` render 1 item
  - File: `src/tools/canvas/components/UnsortItem.tsx` (mới).
  - Render: icon type + name + subtitle (type label). Support object Note, Board, Rect (Phase A). Fallback "Untitled" nếu name rỗng.
  - Style: border rounded, cursor grab, hover border-strong.
  - Verify: hydrate objects với `unsortIndex=0,1,2` → thấy 3 items trong panel đúng thứ tự.

## Phase 3: Cross-board drop → Unsort

- [x] Task 5: Rewrite `moveObjectsToUnsort` action (thay `moveObjectsToBoard` cũ)
  - File: `src/tools/canvas/engine/actions.ts`.
  - Signature: `moveObjectsToUnsort(ids: string[], targetBoardId: string): void`.
  - Logic: snapshot object cũ, đếm items có `unsortIndex !== null && boardId === targetBoardId` (đếm qua IDB vì objects-store chỉ current view — reuse pattern từ `countBoardTreeSize`), reindex existing items +N (N = số object move), gán items mới `unsortIndex = 0..N-1`.
  - Undo: restore snapshot, reindex ngược.
  - Update `useObjectDrag.ts`: `moveObjectsToBoard(ids, targetBoardId)` → `moveObjectsToUnsort(ids, targetBoardId)`.
  - Verify: kéo note trên canvas cha thả lên Board tile → note biến, panel Unsort của board đích có note mới ở top.

## Phase 4: Drag reorder + drag-out

- [x] Task 6: `useUnsortDrag.ts` — reorder trong panel
  - File: `src/tools/canvas/hooks/useUnsortDrag.ts` (mới).
  - Pointer handler: onDown item → track startY, onMove → compute target index (round(currentY / itemHeight)), items khác apply CSS transform translateY, onUp → gán unsortIndex mới cho tất cả items.
  - Action `reorderInUnsort(orderedIds: string[]): void` reindex 0..N-1, push undo với snapshot cũ.
  - Verify: drag item lên/xuống → item khác dịch chuyển live. Thả → thứ tự cập nhật persist.

- [x] Task 7: Drag-out từ Unsort ra canvas
  - Files: `src/tools/canvas/hooks/useUnsortDrag.ts` (extend), `src/tools/canvas/engine/actions.ts` (thêm `moveFromUnsortToCanvas`).
  - Khi cursor rời panel bounds trong lúc drag → chuyển mode "unsort-out", preview floating (reuse `useFloatingDragPreview` nếu có, hoặc simple div follow cursor).
  - Trên canvas surface + mouseup:
    - Nếu drop lên Board tile khác: gọi `moveObjectsToUnsort` (US-2 path, chuyển vào Unsort board đó).
    - Nếu drop trên canvas trống: `moveFromUnsortToCanvas(ids, canvasX, canvasY)` — set `unsortIndex = null`, geometry x/y = drop point, reindex Unsort còn lại.
  - Verify: drag item từ Unsort ra canvas → item hiện trên canvas tại chỗ drop. Panel giảm 1.

## Phase 5: Selection + delete

- [x] Task 8: Selection multi trong Unsort
  - File: `src/tools/canvas/components/UnsortItem.tsx` (extend click handlers).
  - Click item: select 1 (clear others). Ctrl+Click: toggle. Shift+Click: range select từ lastSelected → current.
  - Share `useSelectionStore` với canvas (object.id unique). Item highlight khi `selected.has(id)`.
  - Verify: Ctrl+Click 3 items → 3 items highlight. Click item khác → chỉ item đó chọn.

- [x] Task 9: Delete từ Unsort
  - Files: `src/tools/canvas/hooks/useDeleteKey.ts` (extend detect scope), `src/tools/canvas/components/CanvasApp.tsx` (branch dialog cho Unsort selection).
  - Detect Delete key khi document.activeElement trong panel → chỉ xử lý selection Unsort.
  - Single Unsort item → `deleteObjects([id])` (đã có), reindex Unsort còn lại.
  - Multi → ConfirmDialog số lượng.
  - Board object trong Unsort → cascade dialog (giống canvas).
  - Verify: chọn item trong Unsort → Delete → item biến. Undo → về Unsort đúng chỗ.

## Phase 6: Context menu Move to Unsort + polish

- [x] Task 10: Action `moveToUnsort` cho object trên canvas
  - File: `src/tools/canvas/engine/actions.ts`.
  - Signature: `moveToUnsort(ids: string[]): void` — object hiện trên canvas → gán unsortIndex=0, đẩy items cũ +N.
  - Trigger: giờ chưa có context menu framework trong bibo. MVP: thêm keyboard shortcut Ctrl+Shift+U (hoặc Alt+U) khi có selection canvas → move to Unsort.
  - Verify: chọn note trên canvas, Ctrl+Shift+U → note biến, Unsort có note mới ở top. Undo → về canvas.

- [x] Task 11: Undo/redo pass cho tất cả actions
  - Files: `src/tools/canvas/engine/actions.ts`.
  - Verify từng action push đúng entry, snapshot đủ để restore. Test: move to unsort, drag out, reorder, delete, cross-board drop → mỗi op Ctrl+Z restore đúng.

- [x] Task 12: Polish + verify
  - Files: nhiều — Empty state hint text, ẩn tab khi rỗng option (nếu bạn muốn), toast/microcopy.
  - Verify: `npm run build` pass, `npm run lint` clean.
  - Manual test list ở cuối.

## Định nghĩa "xong" (paste khi báo task hoàn thành)

```
[ ] npm run build pass
[ ] npm run lint pass
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] progress.md đã xoá (nếu tạo)
[ ] Handoff canvas-session-handoff.md cập nhật state Unsort
[ ] Doc/spec liên quan update
```

## Manual verify

1. Bấm tab Unsort → panel trượt vào, canvas thu hẹp. Bấm X hoặc Escape → đóng.
2. Kéo note trên canvas cha thả lên Board tile → note biến khỏi canvas. Vào board → note ở top Unsort. Undo → note về canvas cha.
3. Trong Unsort có 3 items → drag item ở dưới cùng lên top → thứ tự cập nhật, F5 vẫn giữ.
4. Drag item từ Unsort ra canvas trống → item hiện tại chỗ drop.
5. Drag item từ Unsort của board A ra Board tile B trong đó → item chuyển vào Unsort board B.
6. Chọn 2 items Unsort (Ctrl+Click) → Delete → ConfirmDialog số 2 → confirm → biến. Undo → về.
7. Chọn Board object trong Unsort → Delete → cascade dialog nêu content của Board đó.
8. Chọn note canvas → Ctrl+Shift+U → note biến, Unsort có note top.
9. F5 giữ nguyên Unsort state per-board.
10. Tab count badge phản ánh số item Unsort của board hiện tại (đổi board thấy đổi).
