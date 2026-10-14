> LEGACY (chuyển 2026-10-13). Spec đã ship, chỉ còn là lịch sử thay đổi. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Task còn mở (nếu có) đã chép sang `.kiro/notes/backlog.md` / `canvas-backlog.md`.

# Thiết kế — Canvas Nested Boards

**Trạng thái**: Chờ duyệt

## Màn hình / luồng

### Canvas cha
Header 2 row đã có (từ session B2). Row 2 sẽ render breadcrumb khi đang ở board nested; ẩn khi đang ở root (giữ rule cũ).

Board tile trên canvas cha: vuông rounded ~72x72 tô solid theo `Board.color`, dưới tile là tên (editable inline) + secondary "N cards", QuickLineDot top-right. Tile là 1 CanvasObject type `board`, dùng chung engine drag/resize/select với các object khác. Corner resize handle giữ (SelectionLayer đã có).

Toolbar hiện có tile Board placeholder — task này đổi thành real: click = tạo Board tại tâm viewport, drag = tạo Board tại vị trí drop.

### Canvas con
Sau khi double-click Board tile, canvas swap sang board đó. Objects re-hydrate. Camera restore theo `Board.camera` đã persist. Row 2 breadcrumb hiện path đầy đủ Home / ... / current.

Nested unlimited: canvas con cũng có thể chứa Board tile khác, double-click vào tiếp. Không giới hạn depth.

### Breadcrumb
Compute ancestry chain bằng walk `Board.parentId` cho tới `null`. Render inline: `Home / Foo / Bar / Current`. Segment cuối bold + có editable trigger (double-click mở inline rename tên board hiện tại). Segments trước là link muted-foreground, hover → foreground.

Path ≥ 4 segments: hiện `Home / ... / Parent / Current`. Popover cho `...` là nice-to-have.

### Delete flow
1. Board chọn → Delete/Backspace hoặc context menu.
2. ConfirmDialog show: tên board, tổng object descendants (đệ quy toàn tree con), số sub-board.
3. Confirm → cascade delete leaves-up:
   - Recursively collect all descendant Board ids.
   - Delete objects where `boardId ∈ descendants`.
   - Delete Board entities.
   - Delete BoardObject đại diện trên canvas cha.
4. Push undo entry với snapshot đủ để restore.

### Move object cross-board (drop-onto-tile)
Trong `useObjectDrag`, mỗi frame khi drag object non-board, hit-test cursor xem có trên BoardObject khác không.
- Có: set state `hoveredBoardTile` → BoardObject render ring primary + count preview +1.
- Drop trên BoardObject: mutate `object.boardId = tile.data.linkedBoardId`, geometry giữ nguyên, object biến khỏi canvas cha (không còn trong hydrated set), user thấy nó khi vào board con.
- Multi-select drag: tất cả object trong selection chuyển vào cùng board đích.

Không recentre object khi chuyển — Milanote cũng vậy, user thấy object ở nơi họ để.

## Dữ liệu

### Extend `types.ts`
```
Board {
  id, name, parentId (nullable),
  color: string  // Hex "#RRGGBB" hoặc token key
  camera, createdAt, updatedAt
}

boardDataSchema (cho CanvasObject.data khi type='board') {
  linkedBoardId: string
}
```

Board.color mặc định: rotate qua palette 6 màu (VD zinc-700, amber-600, emerald-600, sky-600, rose-600, violet-600) theo thứ tự Board tạo. Persist trong Board record.

### Extend `api.ts`
- `deleteBoard(id)` — xoá 1 Board record.
- `loadBoards()` đã có, đủ để walk tree client-side.
- Cascade delete implement ở `actions.ts` (compute descendants + gọi `deleteObject` + `deleteBoard`), không ở repository.

### Repository giữ nguyên semantics
- `loadObjects(boardId: string | null)` — vẫn `null` = root. Nested pass real id.
- `saveCamera(boardId, camera)` — root board có id thực, cũng save qua id (không đổi).

## Routing

### Route định nghĩa (App.tsx)
```
/canvas                          → CanvasRoute, currentBoardId = null (root)
/canvas/:boardId                 → CanvasRoute, currentBoardId = param
/canvas/:boardId/:slug           → CanvasRoute, currentBoardId = param, slug ignore
```

Nếu React Router v6 syntax:
```
<Route path="/canvas" element={<CanvasRoute />} />
<Route path="/canvas/:boardId" element={<CanvasRoute />} />
<Route path="/canvas/:boardId/:slug" element={<CanvasRoute />} />
```

Hoặc gộp: `/canvas/:boardId?/:slug?` (v6 optional param syntax nếu hỗ trợ, không thì tách 3 route).

### Slug
- Gen từ `Board.name`: lowercase, replace `[^a-z0-9]+` thành `-`, trim leading/trailing `-`.
- Slug KHÔNG check unique — chỉ để URL đọc được. `boardId` là source of truth.
- Rename → slug URL replace (không push history mới, không add back button entry).

### Store `current-board-store.ts`
Zustand store nhỏ giữ `currentBoardId: string | null`. Route sync store qua `useParams` + `useEffect` (khi param đổi → update store; khi navigate programmatic → update param).

### Invalid URL
- boardId trong URL nhưng không có record IDB → redirect `/canvas`, hiện toast/alert.

## Tương tác với tool khác

Chưa có tool khác. Canvas standalone. Sau này Rail + Workspace panel làm spec riêng.

## Điều kiện biên

- **Empty state trong board mới**: CanvasSurface đã có hint mờ center canvas, giữ nguyên.
- **Board rỗng delete**: ConfirmDialog vẫn hiện, message rút gọn.
- **Rename trùng tên**: cho phép. Slug URL vẫn phân biệt qua boardId.
- **Cross-tab delete**: user tab A đang trong board X, tab B xoá X. Tab A không detect realtime (IDB không có subscribe). Reload tab A → invalid URL → redirect root. Chấp nhận UX này, không setup broadcast channel.
- **URL invalid slug đúng id**: `/canvas/abc/wrong-slug` → resolve theo id, replace URL sang slug đúng.
- **Root board id trong URL**: nếu user vô tình paste `/canvas/{rootId}`, resolve về root. Có thể redirect về `/canvas` sạch, hoặc chấp nhận URL với id root — Kiro nghiêng redirect để `/canvas` là canonical form.
- **QuickLineDot trên Board tile**: giữ visual parity Note. Drag logic Line object là backlog #1, không thuộc spec này.
- **BoardObject không có `data` khi legacy**: shouldn't happen vì tạo mới; nếu có, fallback render như missing.

## Quyết định đã hoãn

- Rail 56px + Workspace overlay panel: spec riêng khi bibo có ≥ 2 tool.
- Thumbnail preview mini nội dung Board: backlog.
- Duplicate Board (Ctrl+D): theo bộ shortcut Phase 1 (backlog #5).
- Move Board cross-parent (drag Board vào Board khác): chưa cần, spec riêng nếu user gặp bottleneck.
- Color picker UI: ship default rotate 6 màu trước. Picker chi tiết sau khi có palette dùng chung với Note.
- Deep count (đệ quy) vs shallow count trên tile: chọn **shallow** để render cheap. Deep count chỉ compute khi ConfirmDialog delete.
