> LEGACY (chuyển 2026-10-13). Spec đã ship, chỉ còn là lịch sử thay đổi. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Task còn mở (nếu có) đã chép sang `.kiro/notes/backlog.md` / `canvas-backlog.md`.

# Thiết kế — Canvas Unsort Panel

**Trạng thái**: Chờ duyệt

## Màn hình / luồng

### Layout
Grid canvas hiện: `grid-template-columns: 240px minmax(0, 1fr)` (Toolbar dọc + Canvas). Thêm Unsort panel bên phải:

```
Grid khi Unsort đóng: 240px minmax(0, 1fr)
Grid khi Unsort mở:   240px minmax(0, 1fr) 260px
```

Panel Unsort transition width 300ms `ease-standard` khi mở/đóng, không jerk.

### Tab toggle
Tab dính góc phải-trên canvas surface (tham khảo mockup 04 `.unsort-toggle`):

- Position absolute, top-0 right-0 (tính từ canvas surface, KHÔNG phải viewport toàn màn).
- Border rounded-bl-lg, backdrop blur, 30px height.
- Content: dot warning + icon inbox + "Unsort · N" (N = count).
- Ẩn khi panel đang mở.
- Hover: đổi background muted + text foreground.

### Panel content

Header (h ~48px):
- Icon inbox + "Unsort" title + badge count (warning-soft bg) + close button X.

Description (nếu list rỗng):
- Text mờ small: "Object mới, chưa xếp lên canvas. Kéo thả sang canvas để đặt vị trí."

List items:
- Padding 14px 12px vertical, gap 8px giữa items.
- Mỗi item: flex row, gap 10px, padding 10px, border rounded-lg, cursor grab.
- Icon-box: 30x30 rounded-md, background theo type color.
- Text: strong name (12px semibold) + span subtitle (10.5px muted).

Hint dashed footer (nếu list ≥ 1):
- Border dashed, padding 10px, text center small: "Kéo 1 item ra canvas để đặt lên".

## Dữ liệu

### Extend `CanvasObject`
```
unsortIndex: number | null (default null)
  null = trên canvas (dùng geometry.x,y để render)
  number ≥ 0 = trong Unsort của boardId đó, thứ tự tăng dần từ 0 (top)
```

Zod schema: `unsortIndex: z.number().int().min(0).nullable().default(null)`. Object cũ (Phase A/nested-boards) không có field → default null (giữ trên canvas, không di chuyển).

### Query
- Canvas render: filter `unsortIndex === null && boardId === currentBoardId`.
- Unsort render: filter `unsortIndex !== null && boardId === currentBoardId`, sort theo unsortIndex asc.
- Count badge: đếm items có `unsortIndex !== null && boardId === currentBoardId`.

### Reorder algorithm
Khi insert item mới vào top (unsortIndex=0), items cũ với `unsortIndex >= 0` đều +1. Đơn giản: iterate, patch từng object.

Khi user drag reorder A tới vị trí giữa B và C (giả sử B.index=2, C.index=3), A.index đổi thành 2.5? Không — dùng integer index, phải shift các item khác.

Đơn giản: khi reorder, compute mảng mới theo thứ tự UI, gán `unsortIndex = 0, 1, 2, ...` từ top xuống. O(N) per reorder, N ≤ ~20 items thường. Chấp nhận.

## Interactions

### Cross-board drop → Unsort đích (US-2)
Trong `useObjectDrag.ts`, khi drop lên BoardObject:
1. Snapshot object trước drop (đã có `snapshots` cho undo).
2. Compute `unsortIndex` mới:
   - Đếm items có `unsortIndex !== null && boardId === targetBoardId` = M.
   - Increase existing items' unsortIndex +1 (đẩy xuống).
   - Object mới nhận unsortIndex = 0.
3. `moveObjectsToUnsort(ids, targetBoardId)` mới trong `engine/actions.ts` thay `moveObjectsToBoard` cũ (giữ tương thích thì rename hoặc merge).

Undo: revert boardId + unsortIndex về snapshot cũ + revert items khác về index cũ.

### Drag từ Unsort ra canvas (US-4)
Panel item có handler pointer-events tương tự canvas object drag:
1. `mousedown` trên item → bắt đầu drag mode "unsort-out".
2. `mousemove` → preview floating overlay (icon + name, nhỏ hơn card).
3. `mouseup` trên canvas surface:
   - Compute canvas x/y từ client coord + camera.
   - Set object: `unsortIndex = null`, `geometry.x,y = drop point`.
   - Reindex Unsort items còn lại (fill hole).
4. `mouseup` trên Board tile khác (nested): chuyển vào Unsort board đó (US-2).
5. `mouseup` ngoài canvas + Unsort: revert, không đổi gì.

### Reorder trong Unsort (US-3)
Trong panel:
1. `mousedown` trên item → drag mode "unsort-reorder".
2. `mousemove` → items khác dịch chuyển để nhường chỗ (CSS transform translate).
3. `mouseup`: compute thứ tự mới, gán lại unsortIndex 0..N-1.

Nếu cursor ra ngoài panel trong khi drag → switch mode "unsort-out" (US-4).

### Selection
Panel item click:
- Click: select 1 item (clear others).
- Ctrl+Click: toggle.
- Shift+Click: range select.
- Selection state riêng cho Unsort (không share với canvas selection) hoặc share? Nghiêng share (dùng chung `useSelectionStore`) — object.id là unique, không xung đột. UI panel item highlight theo `useSelectionStore.selected.has(id)`.

### Delete từ Unsort
Panel focused + Delete key → giống canvas: single → xoá, multi → ConfirmDialog. Board object trong Unsort → cascade dialog.

Detect keyboard scope: panel có `tabindex=0`, focus trap khi hover/interact. Delete key handler check `document.activeElement` trong panel.

## Cấu trúc file

New files:
- `src/tools/canvas/components/UnsortPanel.tsx` — panel + list items + toggle tab
- `src/tools/canvas/components/UnsortItem.tsx` — 1 list item render (icon + text + drag handler)
- `src/tools/canvas/hooks/useUnsortToggle.ts` — state open/close (Zustand hoặc local state trong CanvasApp)
- `src/tools/canvas/hooks/useUnsortDrag.ts` — pointer handler cho reorder + drag-out
- `src/tools/canvas/store/unsort-store.ts` — panelOpen state + hoveredUnsortIndex (cho reorder preview)

Edit:
- `src/tools/canvas/types.ts` — thêm `unsortIndex` vào `canvasObjectSchema`
- `src/tools/canvas/engine/actions.ts` — thêm `moveObjectsToUnsort`, `moveFromUnsortToCanvas`, `reorderInUnsort`, `deleteFromUnsort` (hoặc reuse `deleteObjects` — chỉ cần reindex sau delete)
- `src/tools/canvas/hooks/useObjectDrag.ts` — đổi `moveObjectsToBoard` → `moveObjectsToUnsort` cho cross-board drop
- `src/tools/canvas/components/CanvasApp.tsx` — mount UnsortPanel + toggle tab
- `src/tools/canvas/components/CanvasSurface.tsx` — filter `unsortIndex === null` khi render objects layer

## Điều kiện biên

- **Object cũ không có `unsortIndex`**: Zod default null → giữ trên canvas như hiện tại. Không migrate.
- **Cascade delete Board có Unsort content**: `deleteBoardCascade` (đã có) query `loadObjects(boardId)` sẽ load cả object unsorted lẫn canvas. Xoá hết. OK, không cần adjust.
- **Move cross-board khi Unsort đích đang mở**: user thấy item mới xuất hiện ở top (reactive store). Panel tự update.
- **Drag reorder mà items chỉ có 1 item**: skip (không cần).
- **Camera zoom lớn khi drop từ Unsort ra canvas**: drop point compute qua `clientToCanvas(clientX, clientY, camera)` — chính xác trong canvas space bất kể zoom.
- **Undo cross-board drop khi Unsort đích đã bị đóng**: object về canvas cũ, Unsort đích reindex ngược. Panel không cần mở.
- **Persist**: mỗi lần mutate unsortIndex → save object qua repo. Không có store riêng cho Unsort — dùng chung `saveObject`.

## Quyết định đã hoãn

- Auto-mở Unsort panel khi có object mới vào (bặt notify). MVP: user tự mở qua tab.
- Filter/search trong Unsort. Backlog.
- Sort mode khác (theo type / theo time thay vì manual). Manual sort đủ dùng.
- Layout mở Unsort với transition animation cầu kỳ (spring, bounce). Giữ ease-standard cơ bản.
- Empty state illustration (icon lớn / message có ảnh). Hint text đủ.
- Drag reorder với snap animation between items (item khác trượt mượt). MVP: dùng CSS transition transform 60ms `ease-standard` cho item dịch chuyển.
