# Yêu cầu — Canvas Nested Boards

**Trạng thái**: Chờ duyệt
**Cập nhật cuối**: 2026-09-18

## Mục tiêu

Cho phép user tạo Board như một object trên canvas, double-click để vào bên trong (canvas riêng, camera riêng), quay ra bằng breadcrumb. Depth unlimited (kiểu tree Milanote). URL sync per board để refresh resume và share link. Rail 56px + Workspace overlay panel KHÔNG thuộc phạm vi này, sẽ làm sau khi bibo có tool thứ hai.

Trong `types.ts` đã có sẵn `Board.parentId` (nullable) và `CanvasObject.boardId` (nullable) từ Phase A. Cần thêm `Board.color` + `boardDataSchema` cho object type mới, không phải migrate lịch sử.

## User stories

### US-1: Tạo Board mới trên canvas cha
Là user, tôi muốn tạo Board mới bằng cách drag/click "Board" trong Toolbar để có một canvas con.

**Điều kiện chấp nhận**:
- Cho canvas đang mở (cha bất kỳ, cả root), khi drag tile "Board" từ Toolbar drop lên canvas, thì tạo BoardObject tại vị trí drop + tạo Board entity mới `parentId = currentBoardId`, `name = "New Board"`, `color` = màu next trong palette rotate (không random).
- Cho canvas đang mở, khi click tile "Board" một phát (không drag), thì tạo BoardObject ở tâm viewport hiện tại.
- Board vừa tạo có trạng thái rỗng, count = 0.

### US-2: Preview tile Board trên canvas cha
Là user, tôi muốn tile Board hiện icon rõ ràng + tên + số object bên trong để biết "board nào có gì" mà không cần vào.

**Điều kiện chấp nhận**:
- Cho BoardObject trên canvas, thì hiện icon vuông solid rounded ~72x72 tô nguyên bằng `Board.color` (Milanote-style, tham chiếu HTML user cung cấp), tên board bên dưới (title editable), badge secondary "N cards" (đếm object có `boardId === board.id`, không đếm đệ quy để cheap), QuickLineDot top-right (parity Note).
- Cho count = 0, hiện "0 cards" (không ẩn, giữ layout tile ổn định).
- Cho tên rỗng, fallback hiển thị "New Board".
- Cho tên dài, ellipsis 1 dòng, tối đa 2 dòng nếu cần.
- Cho color chưa set, fallback màu neutral (VD `zinc-700`).

### US-3: Vào Board con
Là user, tôi muốn double-click BoardObject để vào canvas của board đó.

**Điều kiện chấp nhận**:
- Cho BoardObject đang chọn, khi double-click (không phải trên vùng title đang edit), thì navigate URL sang `/canvas/:boardId/:slug`, canvas swap: `currentBoardId` đổi sang `linkedBoardId`, objects layer re-hydrate theo boardId mới, camera load từ `Board.camera` của board vừa vào.
- Cho vào board mới (chưa có object), thì canvas hiện empty (hint text mờ giữa surface đã có sẵn từ CanvasSurface).
- Cho user đang edit title, thì double-click KHÔNG kích navigate; editor được ưu tiên.

### US-4: URL routing per board
Là user, tôi muốn URL sync với board đang xem để refresh resume đúng chỗ và share link.

**Điều kiện chấp nhận**:
- Cho ở root board, thì URL = `/canvas` (không có param).
- Cho ở nested board, thì URL = `/canvas/:boardId/:slug?`. Slug = `Board.name` lowercase + replace space thành dash + strip ký tự đặc biệt. Slug optional, `/canvas/:boardId` cũng resolve OK.
- Cho user paste URL `/canvas/:boardId` vào tab mới, thì bootstrap resolve board qua id, load camera + objects, breadcrumb hiện đúng path.
- Cho boardId không tồn tại trong IDB, thì redirect `/canvas` + toast "Không tìm thấy board" (dùng shared toast nếu có, hoặc alert nhẹ).
- Cho user bấm nút Back browser sau khi vào Board, thì về URL trước (parent hoặc root).
- Cho user rename Board, thì slug URL cập nhật đồng bộ ngay (URL replace không push history mới).

### US-5: Breadcrumb path + back parent
Là user, tôi muốn thấy đường dẫn từ Home tới board hiện tại và click segment nào để nhảy về.

**Điều kiện chấp nhận**:
- Cho canvas đang mở, thì Row 2 header hiện path `Home / Foo / Bar` với separator "/", segment cuối là board hiện tại (bold hoặc màu foreground), các segment trước là muted-foreground + clickable link.
- Cho click segment cha, thì navigate URL sang board đó, objects + camera re-hydrate.
- Cho click segment "Home", thì navigate `/canvas`.
- Cho ở root board (`parentId === null`), thì Row 2 title ẩn (giữ rule đã ship, breadcrumb chỉ hiện khi ≥ 1 tầng con).
- Cho path ≥ 4 segments, collapse phần giữa thành `Home / ... / Cha / Con` (giữ 1 đầu + 2 cuối). Nice-to-have: click "..." mở popover list segments bị gộp.

### US-6: Đặt tên Board
Là user, tôi muốn đặt tên Board để phân biệt.

**Điều kiện chấp nhận**:
- Cho BoardObject trên canvas cha, khi double-click vào vùng tên (không phải icon), thì mở inline editor text.
- Cho đang ở trong Board con, khi double-click segment cuối trong breadcrumb, thì mở inline editor tên board đó.
- Cho tên rỗng khi commit, thì fallback "New Board".
- Cho Enter hoặc blur, thì commit + persist + update slug URL nếu đang ở board đó.
- Cho Escape, thì huỷ, giữ tên cũ.

### US-7: Chọn màu Board (nice-to-have)
Là user, tôi muốn đổi màu Board để nhận biết trực quan (tương tự Note color).

**Điều kiện chấp nhận**:
- Cho BoardObject chọn, khi mở color picker (hạ tầng tương lai, VD trong panel props hoặc context menu), thì chọn 1 màu từ palette đã có (dùng cùng palette Note nếu Note đã có, hoặc palette riêng nhỏ 6-8 màu).
- Cho commit color, thì tile trên canvas cha đổi màu ngay, breadcrumb icon (nếu render) cũng đổi.

Ghi chú: US-7 nice-to-have, có thể ship default color rotate + color picker sau nếu chưa có UI palette dùng chung.

### US-8: Delete Board có content
Là user, tôi muốn xoá Board cùng toàn bộ content bên trong nhưng có xác nhận rõ.

**Điều kiện chấp nhận**:
- Cho BoardObject chọn, khi Delete/Backspace hoặc menu Xoá, thì mở ConfirmDialog nêu tên board + tổng số object descendants (đếm đệ quy toàn cây con) + số sub-board.
- Cho user confirm, thì xoá cascade: BoardObject + Board entity + mọi objects `boardId === board.id` + mọi Board con (parentId === board.id) đệ quy từ leaves lên.
- Cho user huỷ, thì không đổi gì.
- Cho Board rỗng (0 object, 0 sub-board), thì ConfirmDialog vẫn hiện nhưng message rút gọn "Xoá board {name}?".
- Cho user đang đứng bên trong board bị xoá (edge case cross-tab), thì fallback redirect về `/canvas` (nice-to-have).

### US-9: Move object cross-board (drop-onto-tile)
Là user, tôi muốn kéo object thả lên BoardObject để chuyển nó vào bên trong board đó.

**Điều kiện chấp nhận**:
- Cho object đang drag trên canvas cha, khi cursor hover trên BoardObject khác board hiện tại, thì BoardObject highlight ring primary + count preview tăng 1.
- Cho drop lên BoardObject, thì đổi `boardId` của object sang `linkedBoardId` của tile. Geometry giữ nguyên (object không bị recentre — nếu user muốn thấy nơi rớt, họ vào board đó sẽ tìm được).
- Cho drop ngoài BoardObject, thì di chuyển bình thường trong canvas hiện tại (giữ behavior cũ).
- Cho drop lên chính BoardObject đại diện board hiện tại (edge case nếu có), thì không đổi.
- Cho drag multi-select có nhiều object, drop lên BoardObject, thì tất cả chuyển vào cùng board đích.

### US-10: Undo/redo cho các thao tác Board
Là user, tôi muốn Ctrl+Z để undo mỗi thao tác tạo/xoá/rename/move-cross-board Board.

**Điều kiện chấp nhận**:
- Cho vừa tạo BoardObject, khi Ctrl+Z, thì Board entity + BoardObject bị xoá.
- Cho vừa delete cascade, khi Ctrl+Z, thì mọi entity xoá đi được restore (không mất content).
- Cho vừa rename, khi Ctrl+Z, thì tên cũ trở lại (và slug URL update nếu đang trong board đó).
- Cho vừa move object cross-board, khi Ctrl+Z, thì object về board cũ, đúng geometry cũ.
- Cho vừa đổi color, khi Ctrl+Z, thì màu cũ trở lại.
- Ctrl+Y hoặc Ctrl+Shift+Z redo tương ứng.

## Phân loại

**Phải có (must-have)**: US-1, US-2, US-3, US-4, US-5, US-6, US-8, US-9, US-10.

**Nên có (nice-to-have)**:
- US-5 collapse popover breadcrumb.
- US-7 color picker (ship default color rotate trước, picker sau).
- US-8 fallback cross-tab.

## Ngoài phạm vi

- Rail 56px + Workspace overlay panel (mockup 04). Chỉ có value khi bibo có ≥ 2 tool.
- Sidebar 232px component palette + tools view (mockup 04 sidebar trái). Toolbar hiện tại đủ dùng.
- Inspector panel phải (mockup 04). Feature riêng, không liên quan nested.
- Unsort panel phải. Feature riêng.
- Thumbnail preview render nội dung mini bên trong BoardObject (Miro-style). Effort gấp 5, để backlog.
- Duplicate Board (Ctrl+D cho Board có content). Theo bộ keyboard shortcut Phase 1 (backlog #5).
- Search / filter cross-board (Ctrl+F tìm object trong toàn tree). Backlog #5 Phase 4.
- Move Board cross-parent (drag Board vào Board khác để đổi parent). Có thể hữu ích nhưng tăng scope; spec riêng nếu cần.
- Migrate object trên root từ `boardId: null` sang `boardId: rootBoard.id`. Không cần vì `null` là marker rõ, không có bug do inconsistency.
