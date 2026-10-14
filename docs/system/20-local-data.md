# 20 — Dữ liệu canvas và lưu trên máy

Cập nhật: 2026-10-13 · Đối chiếu code: 2026-10-13

## Phạm vi

Gồm: data model (Board, CanvasObject, Camera), IndexedDB, hàng đợi ghi, trạng thái lưu, đồng bộ và khoá giữa các tab cùng trình duyệt, khoá khởi động, `version`.

Không gồm: gửi server / outbox (`21`, ở đây chỉ có chỗ nối "ghi chung 1 transaction"), dữ liệu riêng từng loại object (`11`, `12`), undo (`10`).

Đây là nguồn chuẩn hiện tại của dữ liệu: chưa có server, mất ở đây là mất hẳn.

## Hiện trạng

### Data model (`src/tools/canvas/types.ts`, Zod)

| Thực thể | Trường chính | Ghi chú |
|---|---|---|
| `Board` | `id`, `name`, `parentId` (null = Home), `color`, `camera`, `createdAt`, `updatedAt` | Home = board không có cha. Tên mặc định "Home" / "New Board" luôn tiếng Anh vì lưu vào dữ liệu |
| `CanvasObject` | `id`, `type` (chuỗi tự do, sổ loại quyết định), `boardId`, `geometry`, `data: unknown`, `unsortIndex`, `version`, `createdAt`, `updatedAt` | Engine chỉ đọc `geometry` / `type` / `id` / `boardId`, không đọc `data` |
| `geometry` | `x`, `y` (góc trên trái), `width`, `height` (≥ 1), `rotation` (chưa dùng), `zIndex` | Toạ độ canvas, không phải màn hình |
| `unsortIndex` | `null` = trên canvas; `≥ 0` = trong Unsort của `boardId`, 0 là trên cùng | |
| `Camera` | `x`, `y`, `zoom` | 1 camera / board. Schema nhận 0.01–20, lúc nạp kẹp về 0.05–3 |

- `boardId` luôn là id board thật, kể cả Home (quy ước `boardId: null` = Home đã bỏ 2026-10-05).
- Schema `data` theo loại: `noteDataSchema` (`body` HTML, `color`, `heightMode`), `boardDataSchema` (`linkedBoardId`). `imageDataSchema` / `linkDataSchema` đã khai nhưng chưa có loại dùng (spec `canvas-content-objects`); ảnh dự kiến lưu ở kho blob riêng, kho này chưa có.

### IndexedDB (`api.ts`, lớp bọc `lib/idb.ts`)

1 database `bibo-canvas`, phiên bản 3. Không dùng thư viện.

| Store | Khoá | Chứa | Ghi qua |
|---|---|---|---|
| `boards` | `id` | Board, KHÔNG có camera | Ghi thẳng |
| `objects` | `id`, chỉ mục `boardId` | CanvasObject | Hàng đợi ghi |
| `cameras` | `boardId` | `{ boardId, x, y, zoom }` | Ghi thẳng |
| `outbox` | `objectId` | Mục chờ gửi server, mỗi object tối đa 1 mục (`21`) | Cùng transaction với `objects` |

- Camera tách store riêng để lưu board (đổi tên, màu) không đè camera mới, và ngược lại. `saveBoard` bỏ trường `camera` trước khi ghi; `loadBoards` ghép lại (thiếu thì `{0, 0, 1}`).
- Nâng phiên bản: từ < 2 xoá hết store rồi tạo lại (phòng `bibo-canvas` bản 1 rất cũ, dữ liệu cũ bỏ theo chốt 2026-10-11). 2 → 3 chỉ thêm `outbox`.
- Mỗi lần mở database còn chạy xoá nền 2 database cũ `bibo-canvas-boards`, `bibo-canvas-objects` (idb-keyval).
- Mở lỗi thì lần gọi sau mở lại, không giữ lỗi mãi.

### Hàng đợi ghi object (`lib/write-queue.ts`, bọc ở `withWriteQueue` trong `api.ts`)

Mọi `saveObject` / `deleteObject` đi qua 1 hàng đợi kiểu Google Docs:

- Mỗi lúc 1 lô đang ghi; thay đổi mới gom vào "đang chờ". Lô xong mà còn đang chờ thì ghi tiếp ngay. Không debounce (đã chốt, số đo `milanote-sync-architecture.md` mục 2.9).
- Cùng 1 object chỉ giữ thao tác mới nhất (put sau đè put trước, delete đè put).
- 1 lô = 1 transaction: xuống hết hoặc không gì.
- Lô lỗi: dữ liệu giữ lại (trừ khi đã có bản mới hơn) rồi DỪNG; lần enqueue / flush sau mới thử lại. Lỗi không ném cho nơi gọi, hiện qua "Lưu lỗi".
- Kênh `text` (chữ note) / `props` (còn lại) đi kèm mỗi thao tác. Ghi máy vẫn ghi cả object; kênh dùng cho outbox (`21`) và đường lên Yjs.
- `flush()`: chờ phần đang chờ + đang ghi xong. `flush({ urgent: true })` (ẩn tab, `pagehide`, rời route): ghi phần đang chờ ngay, song song với lô đang chạy. Thứ tự vẫn đúng vì trình duyệt chạy các transaction ghi cùng store theo thứ tự tạo.
- Kéo object chỉ ghi lúc thả (`commitMove`), không ghi mỗi lần di chuột.
- Board và camera KHÔNG qua hàng đợi: ghi thẳng, ít và không nằm trên đường gõ / kéo.

### `version`

- Đóng dấu lúc ghi, trong `writeObjects`: đọc bản đang lưu ngay trong transaction đó, ghi `max(version object mang theo, version trên máy) + 1`. Nơi gọi không tự tăng.
- Vì các transaction ghi cùng store chạy lần lượt (kể cả từ nhiều tab), số trên máy chỉ tăng, không trùng, kể cả khi undo ghi lại bản cũ hay tab khác ghi chen. Đã thử MCP 2026-10-13 (2 tab cùng ghi 10 lần → đúng +10).
- Bản trong store (bộ nhớ) có thể mang số thấp hơn số trên máy. Không sao, không ai đọc số trong store.
- Hiện chỉ outbox dùng (làm `baseVersion` của mục gửi). `canvas-sync` có thể để server cấp số riêng.

### Đọc

- `loadObjects(boardId)`: đọc theo chỉ mục `boardId`, rồi gộp phần còn trong hàng đợi (chụp trước và sau khi đọc, để lô xong giữa chừng không trả bản cũ). Object đã chuyển sang board khác trong hàng đợi thì bị bỏ khỏi kết quả.
- `loadObject(id)`: như trên cho 1 object.
- `objects-store` chỉ giữ object của board đang xem (cả canvas lẫn Unsort, phân biệt bằng `unsortIndex`). Việc cần object ngoài board đang xem (xoá cây board, đếm, chuyển board) phải đọc IndexedDB, không dựa store.
- `countAll()` (Cài đặt → Dữ liệu): chờ hàng đợi xong rồi `count()` 2 store, không đọc nội dung.

### Luồng theo board

1. Khởi động (`useCanvasBootstrap`): trong Web Lock `bibo-canvas-bootstrap`, đọc mọi board; chưa có Home thì tạo. Khoá này chặn 2 tab (hoặc 2 lần chạy của StrictMode) cùng tạo 2 Home. Không có Web Lock thì chạy thẳng; lỡ có nhiều Home thì lấy cái tạo sớm nhất.
2. Đổi board (`useBoardSync`): ghi nốt camera board cũ → nạp camera board mới → trỏ hàm lưu camera sang board mới → `flush()` hàng đợi → `loadObjects` board mới → nạp vào store. Đọc lỗi thì nạp danh sách rỗng.
3. Camera: engine gom 500ms (`camera-engine.ts`) rồi `saveCamera`.

### Trạng thái lưu (`store/save-status-store.ts`)

- Chữ "Đang lưu… / Đã lưu / Lưu lỗi" ở hàng tiêu đề board. Tính theo: từng lô ghi object, `saveBoard`, `deleteBoard`. Camera KHÔNG tính (pan liên tục, báo "Đã lưu" là nhiễu).
- "Đang lưu…" chỉ hiện khi ghi lâu hơn 300ms. "Đã lưu" hiện 2s rồi ẩn. "Lưu lỗi" giữ tới lần lưu thành công sau.
- Trạng thái đồng bộ server ("Đã lưu trên máy / Đã đồng bộ / Chưa đồng bộ") là việc của `21`.

### Giữa các tab cùng trình duyệt

- Kênh BroadcastChannel `bibo-canvas` (`lib/tab-channel.ts`). Tin không quay về tab gửi. Không có BroadcastChannel thì mỗi tab chạy riêng.
- Ghi xong 1 lô → báo `{ type: 'objects', puts, deletes }`. Tab nhận (`useCanvasPersistence`) đọc lại từng id từ IndexedDB và cập nhật store: không thêm bước undo, không ghi lại. Bỏ qua object tab mình còn chờ ghi (`hasPendingWrite`) và object đang sửa; kiểm lại sau khi đọc xong.
- Board không báo giữa tab (đổi tên / màu ở tab khác chỉ thấy sau F5).
- Khoá sửa (`lib/edit-locks.ts`, Web Locks `bibo-canvas-edit:{id}`): khoá theo người CHỌN như Milanote. Object đang chọn hoặc đang sửa ở 1 tab thì tab khác không chọn được, thấy nhãn "đang sửa ở tab khác" (`RemoteEditBadge`), nút × để giành quyền (tin `release`). Tab đóng / treo thì trình duyệt tự nhả. Danh sách khoá tab khác hỏi lại khi có tin, khi focus và mỗi 3s. Không có Web Locks thì không khoá.

### Chỗ nối với `21`

Outbox bật (hiện chỉ dev): mỗi lô ghi object mở transaction trên cả `objects` và `outbox`. Trong cùng transaction: đọc bản cũ để biết trường nào đổi, ghi object, gộp mục outbox. Object xuống thì mục xuống, không có trạng thái "đã lưu mà chưa xếp gửi". Cách gom, gửi, xác nhận: `21`.

## Không được phá

| Mã | Luật | Lý do | Giữ bằng |
|---|---|---|---|
| `INV-DATA-01` | Mọi ghi / xoá object đi qua hàng đợi (`saveObject` / `deleteObject` / `deleteObjectsByBoard`), không mở transaction `objects` ở chỗ khác | Thứ tự ghi, gộp bản mới nhất, outbox chung transaction đều dựa vào đây | Review (adapter thô không export) |
| `INV-DATA-02` | 1 lô ghi = 1 transaction; outbox bật thì object + mục outbox cùng transaction đó | Không có object lưu rồi mà mục gửi mất, hay ngược lại | Review + test outbox |
| `INV-DATA-03` | `version` trên máy chỉ tăng: đóng dấu trong `writeObjects` từ số đang lưu. Nơi gọi không tự tăng, không đọc số trong store để so | Nhiều tab / undo không làm số lùi, nền cho phát hiện sửa chen ngang | Review. Thử: 2 tab cùng ghi |
| `INV-DATA-04` | Đọc object phải tính cả phần chưa xuống máy (`loadObjects` / `loadObject` gộp hàng đợi) | Vừa ghi xong đọc lại không ra bản cũ | Review |
| `INV-DATA-05` | Lô lỗi không làm mất dữ liệu: giữ lại để thử lại, báo "Lưu lỗi", không ném cho UI | Không mất chữ khi IndexedDB lỗi tạm | Test `write-queue` |
| `INV-DATA-06` | Ẩn / đóng tab / rời canvas → `flush({ urgent: true })` | Không mất phần đang chờ khi tắt tab | Review `useCanvasPersistence` |
| `INV-DATA-07` | Tin từ tab khác chỉ đọc lại từ máy, không ghi lại, không vào undo; bỏ qua object tab mình còn chờ ghi hoặc đang sửa | Tránh 2 tab ghi qua lại và đè chữ đang gõ | Review |
| `INV-DATA-08` | Board lưu không kèm camera; camera chỉ ghi qua `saveCamera` | Lưu board không đè camera mới | Review |
| `INV-DATA-09` | Tạo Home chỉ trong khoá `bibo-canvas-bootstrap` | Không sinh 2 Home khi mở nhiều tab | Review |
| `INV-DATA-10` | Không thêm debounce ở lớp ghi máy | Đã đo, hàng đợi đủ gom; debounce tăng nguy cơ mất chữ khi tắt tab | Review (chốt `milanote-sync-architecture.md` 2.9) |
| `INV-DATA-11` | `objects-store` chỉ là board đang xem; việc ngoài board đang xem đọc IndexedDB | Store không có object board khác | Review |

## Chỗ trong code

| File | Vai trò |
|---|---|
| `src/tools/canvas/types.ts` | Schema Board / CanvasObject / Camera / data từng loại |
| `src/tools/canvas/api.ts` | Interface `CanvasRepository`, adapter IndexedDB, hàng đợi, `version`, outbox chung transaction, `getOutboxStore` |
| `src/tools/canvas/lib/idb.ts` | Mở database, request / transaction → promise, xoá database |
| `src/tools/canvas/lib/write-queue.ts` | Hàng đợi ghi (thuần, có test) |
| `src/tools/canvas/lib/tab-channel.ts` | Tin giữa các tab |
| `src/tools/canvas/lib/edit-locks.ts` | Khoá chọn / sửa giữa tab |
| `src/tools/canvas/hooks/useCanvasBootstrap.ts` | Nạp board, tạo Home trong khoá |
| `src/tools/canvas/hooks/useBoardSync.ts` | Đổi board: camera + nạp object |
| `src/tools/canvas/hooks/useCanvasPersistence.ts` | Flush khi ẩn tab, nhận tin tab khác, bật khoá + outbox |
| `src/tools/canvas/store/save-status-store.ts` | "Đang lưu / Đã lưu / Lưu lỗi" |
| `src/tools/canvas/store/objects-store.ts`, `boards-store.ts`, `remote-lock-store.ts` | State trong bộ nhớ |

## Nguồn liên quan

- Note `milanote-sync-architecture.md` mục 2.3, 2.5 (3 nhóm lưu trên máy), 2.9 (hiệu năng, không debounce), 2.10.
- Spec cũ: `docs/legacy/specs/canvas-storage-v2/`, `docs/legacy/specs/canvas-note-autosave/`.
- Việc đang dở về hàng đợi: `.kiro/notes/canvas-session-handoff.md` mục "Hàng đợi ghi".

## Câu còn mở

Chỗ hở đã biết. Việc sửa theo dõi ở handoff, không ở đây.

- (2026-10-13) `flush()` báo xong cả khi còn mục ghi lỗi → nơi gọi không biết thành / bại. Handoff "Hàng đợi ghi".
- (2026-10-13) Thả nhiều item có thể tách 2 lô (lô đầu 1 object); kéo item không ở trên cùng ghi 2 lần. Handoff "Hàng đợi ghi".
- (2026-10-13) Xoá board có board con không gói 1 transaction (`deleteBoardCascade`): object qua hàng đợi, board xoá thẳng; đóng tab giữa chừng có thể còn board thiếu object. Bạn chốt ghi hiện trạng. Handoff "Hàng đợi ghi".
- (2026-10-13) `lib/idb.ts` chưa xử `onblocked`: tab khác nâng phiên bản database thì tab này chỉ đóng kết nối, ghi lỗi ("Lưu lỗi") tới khi F5, không báo người dùng. Sửa cùng `canvas-sync`.
