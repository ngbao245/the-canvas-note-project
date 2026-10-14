# 10 — Canvas: phần dùng chung mọi object

Cập nhật: 2026-10-14 · Đối chiếu code: 2026-10-14

## Phạm vi

Gồm: route và URL board, board lồng nhau, header (breadcrumb, hàng tiêu đề, popup), board tile, xoá board có con, camera (pan, zoom, lưới, giới hạn pan, fit), chọn, khung chọn, kéo object (preview nổi, khớp cạnh, kéo ra mép, thả vào board tile / Unsort / thùng rác), resize, thứ tự lớp, undo / redo, Unsort (khay chờ theo board), sao chép / dán / nhân bản, menu chuột phải, thùng rác, thông báo ngắn.

Không gồm: khuôn loại object, sổ đăng ký, thanh tạo object (`11`); note, editor, Card Clipper (`12`); lưu máy, hàng đợi ghi, camera lưu ở đâu (`20`); gửi server (`21`). Phím tắt chi tiết ở `04`, ở đây chỉ nhắc phím chính.

Code tính từ `src/tools/canvas/` trừ khi ghi khác.

## Hiện trạng

### Cây component

```
route.tsx (bootstrap, URL → board, useBoardSync, useCanvasPersistence, useCanvasKeys)
├─ CanvasHeader (zoom CSS theo Kích thước giao diện)
│   ├─ hàng 1: BreadcrumbList | số object · Undo/Redo · HelpMenu · Tìm kiếm · Thông báo · AccountMenu
│   └─ hàng 2: BoardTitleRow (trạng thái lưu | tên board | Chia sẻ · Xuất · % zoom)
└─ CanvasApp (phím xoá / vào Unsort, dialog xoá)
    ├─ CanvasSurface [data-canvas-surface] (wheel, pointer, menu chuột phải)
    │   ├─ nền + 2 lớp lưới (engine ghi style qua ref)
    │   ├─ world wrapper (engine ghi transform) → ObjectsLayer → ObjectView → Renderer + SelectionBox
    │   └─ MarqueeOverlay · Toolbar (có thùng rác) · UnsortToggle · CanvasNotice · CanvasObjectDragPreview · ContextMenu
    ├─ UnsortPanel (overlay phải, luôn mount)
    └─ ConfirmDialog (xoá nhiều / xoá board)
```

### Route và URL (`route.tsx`, `App.tsx`)

| URL | Xử lý |
|---|---|
| `/canvas` | Home |
| `/canvas/:boardId` | Board đó |
| `/canvas/:boardId/:slug` | Link cũ (trước 2026-10-02) → `replace` về `/canvas/:boardId` |
| `/canvas/{id Home}` | `replace` về `/canvas` |
| `/canvas/{id không có}` | `replace` về `/canvas`, không báo gì |

- Board đang xem luôn là id thật (Home cũng vậy), null chỉ khi bootstrap chưa xong. `route.tsx` ghi id vào `current-board-store`; chỗ khác đọc store, không gọi `useParams`.
- Đang tải (bootstrap hoặc board chưa có trong store): `LoadingState` "Đang tải canvas...". Lỗi: `ErrorState` + tải lại trang.
- Đổi board: `useBoardSync` chuyển lịch sử undo sang stack của board mới, ghi nốt camera board cũ, nạp camera + object board mới (chi tiết `20`). Không xoá vùng chọn.
- `lib/slug.ts` (`boardSlug`) còn file nhưng không nơi nào gọi.

### Board lồng nhau

- Cây board qua `Board.parentId` (null = Home). Board con hiện trên board cha bằng 1 object `type: 'board'`, `data.linkedBoardId`.
- Tạo board: `createBoardAt` tạo Board + tile trong 1 bước undo, tên "New Board", màu xoay vòng `BOARD_COLOR_PALETTE` theo số board anh em (`types.ts`).
- Đổi tên: `renameBoard` (rỗng → "New Board", 1 bước undo). 2 chỗ sửa: double-click tên trên tile, double-click tên ở hàng tiêu đề header. Home không đổi tên được.
- Thả object lên tile (kéo trên canvas hoặc kéo từ Unsort): object vào Unsort của board đó (`moveObjectsToUnsort`). Trong cụm có tile board thì board đó đổi cha theo. Đưa board vào chính nó / board con của nó → bỏ cả thao tác, không báo.

### Board tile (`components/objects/BoardObject.tsx`)

- Khung 98 × 139, khối vuông 72 × 72 tô `Board.color`, tên (tối đa 2 dòng), dòng "N cards" đếm object có `boardId` = board con (chỉ 1 cấp, gồm cả Unsort của board đó nếu đang nạp trong store).
- Double-click khối vuông → `navigate('/canvas/:id')`, `stopPropagation` để không vào sửa. Double-click tên → nổi lên `ObjectsLayer` → sửa tên tại chỗ (ô nhập bỏ qua blur 250ms đầu để không tự đóng).
- Viền chọn bọc khối vuông (loại có `ownSelectionFrame`, `11`), không có góc resize.
- Đang có object kéo ngang qua: khối vuông có vòng `primary`, số đếm cộng đúng số object canvas đang kéo (kéo item Unsort / nút thanh tạo vẫn +1). Đổi 2026-10-14, trước luôn +1.

### Xoá (`CanvasApp.tsx`, `engine/actions.ts`)

| Đường | Kết quả |
|---|---|
| Delete / Backspace, chỉ 1 board tile | Dialog "Xoá board" đếm board con + object cả cây (đếm từ IndexedDB, lúc đếm hiện "Đang đếm"). Xác nhận → `deleteBoardCascade` |
| Delete / Backspace, board tile lẫn object khác, hoặc nhiều tile | Dialog "Xoá nhiều mục" đếm hết: mỗi tile = 1 board + cây con, object = object khác + nội dung các cây. Xác nhận → `deleteSelectionWithBoards` (xoá hết, 1 bước undo qua `beginHistoryGroup` / `endHistoryGroup`) |
| Delete / Backspace, nhiều object (không có tile) | Dialog "Xoá N object" → `deleteObjects` |
| Delete / Backspace, 1 object | Xoá thẳng |
| Nút thùng rác trên Toolbar, kéo thả vào thùng rác, Ctrl+X | `deleteObjects` thẳng, không dialog, kể cả board tile |

- Dialog: Esc huỷ, Enter xác nhận (trừ khi focus đang ở 1 nút), bấm nền huỷ. Lớp phím `overlay` chặn mọi phím canvas khi mở. Câu mô tả chèn tổ hợp Undo lấy từ bảng phím.
- `deleteBoardCascade`: chụp board + object cả cây, xoá object rồi board từng cấp, cuối cùng xoá tile; 1 bước undo khôi phục hết. Không nằm trong 1 transaction (xem handoff mục hàng đợi ghi).
- Mọi đường xoá đều undo được; undo `deleteObjects` chọn lại các object vừa khôi phục.

### Header

- `CanvasHeader`: phóng theo Kích thước giao diện bằng CSS `zoom`. Gốc `select-none` của vùng header.
- Số object: `objects.size` của board đang nạp (gồm cả item trong Unsort). Undo / Redo mờ khi stack rỗng, tooltip có tổ hợp phím.
- Tìm kiếm, Thông báo, Chia sẻ: nút `aria-disabled`, tooltip "Sắp có".
- `HelpMenu`: popup 2 mục: Phím tắt (mở modal, cũng mở bằng `/`) và Hướng dẫn (Sắp có).
- `HeaderPopups`: nút Xuất (popup giao diện, chưa xuất được) và nút % zoom (popup View). Popup View: thanh zoom thang log chỉ hiện vị trí; nút "Về 100%" khi đang khác 100%, "Vừa nội dung" khi đúng 100%; phần Trình chiếu là giao diện, chưa chạy. % hiện zoom board (không gồm tỉ lệ giao diện).
- `BoardTitleRow`: trái là trạng thái lưu / đồng bộ (`20`, `21`), giữa là tên board, phải là Chia sẻ · Xuất · % zoom. Luôn hiện, cả ở Home.

### Breadcrumb (`BreadcrumbList.tsx`, `hooks/useBreadcrumbFit.ts`)

- Chuỗi Home → board đang xem, đi ngược `parentId`, có `Set` chặn vòng khi dữ liệu lỗi. Home: chấm tròn đen; board: ô màu `Board.color`. Ngăn bằng chevron.
- Board đang xem là chữ mờ, không phải link. Cấp cha là `Link` (Home → `/canvas`).
- Tên mỗi cấp tối đa 300px. Thiếu chỗ: ẩn dần cấp giữa (từ gần Home) thành nút "...", bấm mở menu các cấp ẩn. Ẩn hết vẫn thiếu thì tên board hiện tại cắt "…".
- Đo bằng lớp ẩn chứa đủ mục, `ResizeObserver` trên khung + lớp đo, `useLayoutEffect` (không nháy). Cả 2 phía đo bằng `getBoundingClientRect` vì header có CSS `zoom`. Hàm thuần `computeHiddenCount`.

### Camera (`engine/camera-engine.ts`, `camera.ts`, `coord.ts`, `store/camera-store.ts`)

- `CameraEngine` là 1 thể duy nhất (`getCameraEngine()`), không phải React state. Giữ 2 camera: `target` (đích) và `current` (đang vẽ, đuổi theo đích bằng rAF). Ghi `transform` world wrapper + style lưới thẳng qua ref. `camera-store` chỉ là bản chụp cho React (badge %, viền chọn bù zoom).
- Toạ độ: `screen = canvas × zoom + camera.xy`. `clientToCanvas` tự lấy rect của `[data-canvas-surface]`.
- Tỉ lệ giao diện: camera trong engine lưu zoom HIỆU DỤNG = zoom board × tỉ lệ. Lưu máy, giới hạn zoom, mốc 100%, badge % dùng zoom board. Đổi tỉ lệ: zoom board và x/y giữ nguyên, vẽ lại ngay.
- Lưu camera: gom 500ms theo `target`, ghi qua callback do `useBoardSync` gắn theo board (`20`).

| Thao tác | Cách chạy |
|---|---|
| Lăn chuột | Pan dọc mượt (`panSmooth`). Tốc độ theo Cài đặt (`SCROLL_SPEED_FACTOR`, mặc định 0.5) |
| Shift + lăn | Pan ngang |
| Ctrl / Cmd + lăn, pinch trackpad | Zoom quanh con trỏ theo nấc: vào ×1.25, ra ×0.75 mỗi nấc, không phụ thuộc độ lớn `deltaY`. Đuổi mượt trên thang log (alpha 0.2), giữ điểm dưới con trỏ đứng yên |
| Mốc 100% | Nấc băng qua 100% bị kẹp về đúng 100%. Lăn tiếp liên tục bị nuốt; ngừng ≥ 250ms rồi lăn mới vượt |
| Space giữ + kéo, chuột giữa kéo, Ctrl / Cmd + kéo | Pan 1:1 (`pan`). Space đổi con trỏ `grab` trong mặt canvas, lúc kéo `grabbing` toàn trang |
| `F` | Fit nội dung (lề 15% mỗi phía, tối thiểu 80px). Không có object → về 100% |
| `0`, Ctrl+0 | Về `{0, 0}`, 100% |
| Ctrl + `+` / `-` | Zoom nấc quanh tâm màn hình |

- Giới hạn zoom: 5%–300% (`types.ts`). Zoom tối thiểu động (`computeDynamicZoomMin`): luôn ra được 40%; nội dung trải rộng thì hạ xuống mức fit. Giới hạn chỉ áp cho thao tác zoom mới, không kéo camera đang ở dưới lên.
- Giới hạn pan (`pan-bounds.ts`): khung nội dung + lề 30% mỗi phía phải còn ít nhất 1 phần trên màn hình. Không có object → không giới hạn.
- Khung nội dung (`computeContentBounds`) chỉ tính object trên canvas, bỏ item Unsort (từ 2026-10-13). Số "N mục" ở header vẫn đếm cả Unsort (tổng của board). Lúc kéo / resize bỏ các object đang chọn ra để khung không chạy theo. Tính lại qua `subscribe` store khi object đổi, khi đổi mode, khi đổi kích thước giao diện, khi viewport đổi (`ResizeObserver`).

### Lưới (`engine/grid-lod.ts`)

2 lớp chấm (dày + thưa) cùng `radial-gradient` (màu `foreground` 9%). Bước gốc 32px. `t = log2(1/zoom)`: lớp dày `32 × 2^floor(t)`, lớp thưa gấp đôi, mờ chéo theo phần lẻ → khoảng chấm trên màn luôn trong 16–64px. Zoom < 20% mờ dần, < 15% tắt. Ẩn / hiện theo Cài đặt (chỉ ẩn 2 lớp chấm).

### Chọn (`hooks/usePointerInteraction.ts`, `useObjectDrag.ts`, `store/selection-store.ts`)

| Thao tác | Kết quả |
|---|---|
| Bấm object chưa chọn | Chọn riêng nó |
| Bấm object đang trong vùng chọn | Giữ cả vùng chọn (để kéo cả cụm) |
| Shift + bấm object | Bật / tắt object đó |
| Ctrl / Cmd + bấm object (không kéo quá 5px) | Bật / tắt. Ctrl + kéo trên object = pan |
| Bấm vùng trống | Bỏ chọn (Shift giữ thì giữ nguyên) |
| Bấm vùng trống lúc đang sửa | Bỏ chọn + editor tự blur thoát sửa (về canvas hẳn, không qua 2 tầng) |
| Kéo vùng trống > 3px | Khung chọn nét đứt (screen-space). Thả: chọn object có khung chạm khung chọn (canvas-space). Shift = thêm vào, không thì thay |
| Ctrl+A | `activePanel = 'canvas'`: mọi object canvas của board. `'unsort'`: mọi item Unsort |
| Esc | Tầng 1 thoát sửa (editor xử), tầng 2 bỏ chọn. Unsort đang mở: Esc đóng panel trước |

- Vùng chọn dùng chung canvas + Unsort (1 `Set` id). Object đang khoá ở tab khác không vào được vùng chọn; tab khác vừa khoá thì tự bỏ khỏi vùng chọn.
- Khung chọn, Ctrl+A canvas, sao chép, nhân bản, thứ tự lớp bỏ object trong Unsort.
- macOS Ctrl + bấm (= chuột phải): không chọn, không kéo, không pan.

### Viền chọn (`components/SelectionBox.tsx`)

- Nằm TRONG khối card (con của `ObjectView`, hoặc con của phần thân với loại `ownSelectionFrame`), cùng lớp z với card. Card nằm trên che cả card lẫn viền.
- Viền vẽ bằng `box-shadow` 2px bù zoom (luôn 2px trên màn), khít mép phần tử cha. Có `data-canvas-overlay`.
- Chỉ khi chọn đúng 1 object: chấm QuickLine góc phải trên (chỉ hình, chưa kéo được) + góc resize phải dưới (trừ `resizable={false}`).

### Kéo object (`hooks/useObjectDrag.ts`, `CanvasObjectDragPreview.tsx`, `FloatingObjectPreview.tsx`)

1. `pointerdown` trên `ObjectView`: chọn (như bảng trên), lưu điểm nắm canvas-space. Object đang sửa / chuột giữa / Ctrl / khoá tab khác → không vào luồng kéo.
2. Vượt 5px: mode `dragging`, `bringToFront` object chính (1 bước undo riêng), chụp vị trí ban đầu, ẩn MỌI object đang chọn bằng `visibility: hidden`, bật preview nổi + vòng kéo ra mép.
3. Mỗi `pointermove`: dời vị trí trong store (`applyMoveDelta`, không ghi, không undo) theo điểm nắm tuyệt đối; xác định vùng dưới con trỏ (`lib/hit-test.ts`); preview theo con trỏ.
4. Thả: xử theo vùng, bảng dưới. `pointercancel` → trả về chỗ cũ.

| Vùng lúc thả (ưu tiên từ trên) | Kết quả |
|---|---|
| Thùng rác (`data-trash-drop`) | Trả vị trí cũ rồi `deleteObjects` (undo xoá ra đúng chỗ cũ) |
| Board tile khác (`data-board-tile-id`) | Trả vị trí cũ, vào Unsort board đó |
| Unsort (`data-unsort-drop-target`: tab hoặc panel) | Trả vị trí cũ, vào Unsort board hiện tại |
| Overlay (`data-canvas-overlay`) / ngoài canvas | Trả vị trí cũ, không gì cả. Lúc kéo con trỏ `not-allowed` |
| Canvas trống | Khớp cạnh → `commitMove` (ghi + 1 bước undo) → card trượt vào chỗ khớp 120ms (bỏ khi `prefers-reduced-motion`) |

- Preview nổi: portal ra `body`, `position: fixed`, tầng `--z-drag-layer`, vẽ bằng chính Renderer của loại trong khung kích thước gốc + `scale(zoom)` (chữ, lề, bóng scale cùng). Bóng nhấc `0 12px 32px` (bỏ với loại `ownSelectionFrame`). Không nhận chuột. Mờ 0.5 khi con trỏ không ở canvas trống.
- Kéo nhiều: preview vẽ cả cụm (`CanvasObjectDragPreview` đọc `ids` trong `canvas-drag-store`), mỗi object giữ đúng khoảng cách với object chính, xếp theo `zIndex`. Object thật ẩn tại chỗ để không thấy 2 bản. Đổi 2026-10-14 (bạn báo): trước chỉ object chính có preview, các object khác biến mất tới khi thả, trong khi chúng vẫn thuộc board này cho tới lúc thả (`INV-CANVAS-21`).
- 3 kiểu kéo dùng chung `FloatingObjectPreview`: object canvas (`selected` true), item Unsort (`selected` true), nút trên thanh tạo (`selected` false, object chưa có).
- Thùng rác lúc có object kéo qua: nền + chữ `destructive`, phóng 1.1.

### Khớp cạnh (`engine/alignment.ts`)

- Chỉ lúc thả trên canvas, không hút lúc kéo, không vẽ đường gióng, luôn bật.
- Khung gộp của cụm so với object canvas khác đang hiện trên màn (bỏ cụm, bỏ Unsort). Chỉ so cùng loại cạnh: trái-trái, tâm-tâm, phải-phải; trên-trên, tâm-tâm, dưới-dưới.
- Ngưỡng 6px màn hình (chia zoom). Mỗi trục lấy cặp lệch ít nhất; không có thì khớp lưới 4 canvas-px theo cạnh trái / trên.

### Kéo ra mép (`hooks/useEdgePan.ts`)

Vòng rAF lúc kéo object: con trỏ cách mép mặt canvas < 60px → pan, tốc độ tăng dần tới 8px/frame ở sát mép. Chỉ chạy khi con trỏ ở vùng `canvas` (không đè thùng rác / toolbar). Chỉ pan trục mà nội dung (bỏ object đang kéo) còn vượt màn hình phía đó; không có nội dung khác → không pan. Sau mỗi lần pan, object bám lại con trỏ.

### Resize (`SelectionBox.tsx` → `CornerResizeHandle`)

- Chỉ góc phải dưới, chỉ khi chọn 1 object. Neo góc trái trên. Tối thiểu 40 × 40 (`MIN_OBJECT_SIZE`). Con trỏ `nwse-resize`.
- Lúc kéo: `previewResize` (chỉ store), mode `resizing`. Thả: `commitResize` (ghi + 1 bước undo), rồi `onResizeCommit` của loại nếu kích thước đổi (`11`).
- Góc resize `stopPropagation` + chặn double-click lọt lên card.

### Thứ tự lớp (`engine/actions.ts`)

- `geometry.zIndex` trong board, chỉ object canvas. DOM xếp theo `zIndex` tăng dần.
- Object mới / dán / nhân bản nằm trên cùng (`INV-OBJ-07`). Bắt đầu kéo: object chính lên trên cùng.
- `bringToFront` / `sendToBack`: lớn nhất + 1 / nhỏ nhất − 1. `bringForward` / `sendBackward`: đổi chỗ với object kế trên / dưới, 1 bước undo. Phím Ctrl+] / [ , Ctrl+Shift+] / [ (theo `code`), áp cho mọi object đang chọn; không chọn gì vẫn nuốt phím (chặn Back / Forward trình duyệt Mac).

### Undo / redo (`store/history-store.ts`)

- Lịch sử riêng từng board (từ 2026-10-14): mỗi board 1 cặp stack undo / redo, tối đa 100 bước mỗi board. `useBoardSync` gọi `setActiveBoard` khi đổi board; Ctrl+Z và nút Undo / Redo ở header chỉ dùng stack của board đang xem. Quay lại board cũ vẫn undo / redo tiếp được. Stack chỉ nằm trong bộ nhớ, F5 là mất; board bị xoá vẫn giữ stack (undo xoá thì board quay lại cùng lịch sử).
- `Command = { undo, redo, label }`. Nơi gọi tự làm thao tác (store + ghi), rồi `push`; history chỉ chạy `redo` khi redo. Push mới xoá stack redo của board đó. Mọi `push` phát sinh trong lúc đang chạy undo / redo bị bỏ (vài lệnh redo gọi lại hàm gốc, hàm đó tự push).
- Lệnh vào stack của board đang xem lúc làm, kể cả khi đổi dữ liệu board khác (thả vào tile, chuyển vào Unsort board khác, xoá cây board). Lệnh chờ IndexedDB rồi mới push (`deleteBoardCascade`) truyền board lúc bấm (`push(cmd, boardId)`); nhóm (`beginHistoryGroup` / `endHistoryGroup`) vào board lúc begin.
- Lớp chặn thứ 2: lệnh undo / redo đưa object vào store qua `putInView` (`engine/actions.ts`): chỉ object có `boardId` = board đang xem mới vào store, board khác chỉ ghi máy.
- 1 bước: tạo object, tạo board + tile, đổi tên board, di chuyển (cả cụm), resize, xoá (cả cụm), xoá cây board, đổi lớp, dán / nhân bản cả cụm, vào / ra / sắp lại Unsort, sửa data. Label tiếng Anh, chưa hiện trên UI.
- Phím: Ctrl+Z, Ctrl+Shift+Z / Ctrl+Y; nút ở header. Lớp tool không chạy khi đang gõ (Ctrl+Z trong note do Tiptap xử).

### Unsort (khay chờ) (`UnsortPanel.tsx`, `UnsortItem.tsx`, `hooks/useUnsortDrag.ts`, `useUnsortMarquee.ts`, `store/unsort-store.ts`)

- Theo từng board: item là object có `unsortIndex !== null` và `boardId` = board đang xem, xếp theo `unsortIndex` tăng dần. Không có Unsort chung.
- Panel: overlay tuyệt đối bên phải, rộng 260 × tỉ lệ giao diện, trượt bằng `translateX` (`duration-normal`). Luôn mount, chỉ đổi transform. Nút X, Esc đóng. Panel đang nạp board: số đếm là khối chờ, danh sách trống.
- Tab mở (`UnsortToggle`): góc phải trên mặt canvas, ẩn khi panel mở, có số item. Tab và panel đều là đích thả (`data-unsort-drop-target`), có vòng `primary` khi object kéo qua.
- Item: rộng 232, cao theo tỉ lệ object thật, kẹp 60–140, cách nhau 8px. Icon theo loại + tên (note: chữ khối đầu, đọc bằng `DOMParser`; board: tên board) + phụ đề loại.
- Chọn: bấm = chọn riêng + đặt mốc; Ctrl / Cmd = bật / tắt + đặt mốc; Shift = chọn dải từ mốc. Kéo vùng trống trong panel > 4px = khung chọn (Ctrl / Shift = thêm vào). Bấm vùng trống không kéo = bỏ chọn. `activePanel` = `'unsort'` khi bấm trong panel, về `'canvas'` khi bấm ngoài hoặc đóng panel.
- Kéo item (> 4px, chọn item nếu chưa chọn):
  - Trong panel: vạch chèn `primary`, thả → `reorderInUnsort` (chỉ dời 1 item). Chỗ chèn đo từ vị trí thật từng item (`getBoundingClientRect`, so con trỏ với điểm giữa item), vì item cao 60–140 không đều. Vạch đặt giữa khe 8px theo `offsetTop` của item (không lệch khi đổi kích thước giao diện hay cuộn). Thả đúng chỗ cũ thì không hiện vạch, không đổi gì. Không có số đo cứng (đổi 2026-10-14, trước dùng bước 148px nên lệch với item ngắn).
  - Ra ngoài panel: item ẩn khỏi danh sách, preview nổi theo con trỏ (cỡ thật × zoom, điểm nắm co theo tỉ lệ). Thả trên canvas trống → `moveFromUnsortToCanvas` (tâm object tại điểm thả, nhiều item lệch 20px nối nhau, chọn các item vừa đặt). Thả trên board tile → Unsort board đó. Thả chỗ khác → không gì cả, con trỏ `not-allowed` lúc kéo.
- Vào Unsort: kéo thả vào tab / panel, Ctrl+Shift+U (object canvas đang chọn), thả lên board tile. Item mới vào đầu danh sách, item cũ đẩy xuống. Geometry giữ nguyên, dùng lại khi kéo ra.
- Unsort chọn nhiều phần 2 (preview chồng, sắp lại nhiều item): chưa làm, spec `canvas-unsort-multi-select` Task 5-7.

### Sao chép / dán / nhân bản (`lib/clipboard.ts`, `hooks/useCanvasKeys.ts`)

- Ctrl+C / X: ghi object canvas đang chọn ra clipboard hệ thống dạng chuỗi `canvas-clip:v1:{json}` (chỉ `type`, `geometry`, `data`). Không có object canvas nào chọn → trả phím cho trình duyệt (copy chữ thường). Đặt lại bộ đếm dán về 0. X xoá sau khi ghi.
- Ctrl+V: đọc clipboard, kiểm từng object (`INV-OBJ-04`). Lần dán thứ N kể từ lần copy: cả cụm lệch `N × 16` canvas-px so với vị trí gốc, không dán tại chuột. Dán vào board đang xem (sang board khác được). Chuỗi thường, JSON lỗi, sai bản → bỏ qua, không báo. 1 bước undo, chọn các object mới.
- Ctrl+D: nhân bản object canvas đang chọn, lệch +16, không đụng clipboard, 1 bước undo. Không chọn gì → trả phím cho trình duyệt.
- Bộ đếm dán (`pasteCounter`) nằm trong bộ nhớ, không lưu.

### Menu chuột phải (`ContextMenu.tsx`)

Chuột phải bất kỳ đâu trên mặt canvas (cả trên object): menu 1 mục "Thêm Note", tạo note có tâm tại điểm bấm. Đóng khi bấm ngoài, Esc (lớp Esc riêng, không lọt xuống canvas bỏ chọn), hoặc chọn mục.

### Thông báo ngắn (`CanvasNotice.tsx`, `store/notice-store.ts`)

`showNotice(key)` lưu KEY dịch, hiện giữa mép trên canvas 2.5s, `role="status"`, không nhận chuột. Báo lại cùng câu thì đặt lại hẹn giờ (`seq`). Đang dùng: object đang được sửa ở tab khác (bấm / double-click / kéo).

### Con trỏ

Theo 3 tầng của `coding-style.md`. Ở đây: object `cursor-move` (đang sửa thì không), item Unsort `cursor-grab`, góc resize `nwse-resize`, tên board ở header `cursor-text`. Tạm thời: `setCursorOverride` (`src/lib/cursor-override.ts`): `grab` khi giữ Space (chỉ mặt canvas), `grabbing` khi pan, `not-allowed` khi kéo vào vùng không thả được; tắt ở cleanup của chính hook.

## Không được phá

| Mã | Luật | Lý do | Giữ bằng |
|---|---|---|---|
| `INV-CANVAS-01` | Viền chọn (cùng chấm, góc resize) nằm trong khối card, không đặt tầng riêng có `zIndex` cố định | Bản cũ để tầng riêng: viền card dưới nổi đè card trên | Review `SelectionBox`, `ObjectsLayer` |
| `INV-CANVAS-02` | Card đang chọn LUÔN có viền, kể cả preview lúc kéo (`FloatingObjectPreview selected`). Lúc kéo, card nguồn ẩn nên viền world ẩn theo, chỉ preview có viền. Kiểu kéo mới phải kế thừa | Không để preview "trần"; không vẽ 2 viền lệch nhau khi zoom ≠ 100% | Review |
| `INV-CANVAS-03` | Kéo không tạo object bản sao: nguồn ẩn tại chỗ, vị trí dời ngầm trong store, preview là render lại cùng object; chỉ ghi + push undo lúc thả | Không sinh dữ liệu thừa; thả vào vùng sai trả về đúng chỗ cũ | Review `useObjectDrag` |
| `INV-CANVAS-04` | Lăn chuột trên mặt canvas: listener native `passive: false` + `preventDefault`. Chặn lăn ở overlay (Toolbar) cũng bằng listener native | `stopPropagation` của React không chặn được listener native | Review `CanvasSurface`, `Toolbar` |
| `INV-CANVAS-05` | `pointerdown` của mặt canvas bỏ qua phần tử trong `[data-object-id]` / `[data-canvas-overlay]`. Overlay mới đặt trong mặt canvas phải gắn `data-canvas-overlay` | Không bật khung chọn / pan song song khi bấm nút, viền, toolbar | Review `usePointerInteraction` |
| `INV-CANVAS-06` | Đọc store sau khi đổi: gọi lại `getState()`, không dùng biến lấy trước khi đổi | Map cũ giữ bản cũ → ghi / undo sai dữ liệu | Review `engine/actions.ts` |
| `INV-CANVAS-07` | Board tile: double-click khối vuông vào board (`stopPropagation`), double-click tên để sửa tên | 2 thao tác trên 1 tile không đè nhau | Review `BoardObject` |
| `INV-CANVAS-08` | Mọi chỗ đi theo cây board phải chặn vòng (`Set` trong breadcrumb, chặn đưa board vào chính nó / board con) | Dữ liệu lỗi không treo trang | Review |
| `INV-CANVAS-09` | Unsort theo từng board (`boardId` + `unsortIndex`), không làm Unsort chung | Bạn kiểm 2026-10-12: theo board là đúng | Review |
| `INV-CANVAS-10` | `UnsortPanel` luôn mount, mở / đóng chỉ đổi transform | Giữ state panel (cuộn, kéo) | Review `CanvasApp` |
| `INV-CANVAS-11` | Ctrl+V: lần N lệch `N × 16` từ vị trí gốc, không dán tại chuột; dán được sang board khác; chuỗi thường bỏ qua im lặng; cả cụm 1 bước undo | Milanote; Ctrl+V trên chữ thường không báo lỗi | Review `useCanvasKeys` |
| `INV-CANVAS-12` | Ctrl / Cmd + lăn và pinch luôn zoom camera canvas, không zoom trang (capture trên `window` ở `App.tsx` + listener canvas) | Pinch nhầm phóng cả app | Review. Xem `01` bước 7 |
| `INV-CANVAS-13` | Pan / zoom ghi DOM qua ref trong `CameraEngine`, không qua React state mỗi frame; `camera-store` chỉ là bản chụp | 60Hz qua setState render lại cả cây | Review |
| `INV-CANVAS-14` | Mọi phép đổi toạ độ dùng camera hiệu dụng (`getCamera()`); lưu máy, giới hạn zoom, mốc 100%, badge % dùng zoom board | Đổi Kích thước giao diện không làm lệch kéo / thả / chọn, không đổi zoom đã lưu | Review `camera-engine` |
| `INV-CANVAS-15` | Lúc kéo / resize chỉ đổi store; thả mới ghi + 1 bước undo. Thao tác nhiều phần (board + tile, cụm dán, đổi chỗ lớp, cây board) là 1 bước undo | F5 giữa lúc kéo không lưu vị trí dở; Ctrl+Z không phải bấm nhiều lần | Review `engine/actions.ts` |
| `INV-CANVAS-16` | URL board chỉ dùng id. Home = `/canvas`; id Home, link có slug, id không có → `replace` về dạng chuẩn | Đổi tên không đổi link; không lưu lịch sử trình duyệt rác | Review `route.tsx` |
| `INV-CANVAS-17` | Khớp cạnh chỉ lúc thả, chỉ so cùng loại cạnh với object đang hiện trên màn, không đường gióng | Card bám chuột mượt; không hút vào thứ không thấy (Milanote) | Review `alignment.ts` |
| `INV-CANVAS-18` | Khung chọn, Ctrl+A canvas, sao chép, nhân bản, thứ tự lớp, khung nội dung (Fit, giới hạn pan, zoom tối thiểu, kéo ra mép) bỏ object trong Unsort | Item Unsort không vẽ trên canvas nhưng vẫn giữ geometry → chọn nhầm | Review |
| `INV-CANVAS-19` | Object đang khoá ở tab khác không vào vùng chọn (chặn 1 chỗ trong `selection-store`) | Không kéo / xoá / đổi màu đè bản tab khác đang sửa | Review |
| `INV-CANVAS-20` | Lịch sử undo riêng từng board; lệnh push sau `await` phải truyền board lúc bấm. Lệnh undo / redo đưa object vào store qua `putInView`, không gọi `objects-store.add` thẳng | Bản cũ 1 lịch sử chung: Ctrl+Z ở board B làm object board A hiện nhầm trên B (thử MCP 2026-10-14) | Test `history-store.test.ts` + review `engine/actions.ts` |
| `INV-CANVAS-21` | Kéo nhiều object: mọi object đang kéo đều hiện (preview cả cụm, giữ khoảng cách) cho tới khi thả | Object chưa thả vẫn thuộc board này; biến mất làm người dùng tưởng mất (bạn báo 2026-10-14) | Review `CanvasObjectDragPreview.tsx` |

## Chỗ trong code

| File | Vai trò |
|---|---|
| `src/App.tsx` | 3 route canvas, chặn Ctrl + lăn zoom trang |
| `src/tools/canvas/route.tsx` | URL → board, chuyển hướng, Fit / Reset, phím canvas |
| `components/CanvasApp.tsx` | Bố cục, phím xoá / vào Unsort / đóng Unsort, dialog xoá |
| `components/CanvasSurface.tsx` | Lăn chuột, lưới, world wrapper, menu chuột phải, tính lại giới hạn |
| `components/ObjectsLayer.tsx`, `objects/ObjectShell.tsx` | Vẽ object theo `zIndex`, double-click vào sửa, khung chung |
| `components/SelectionBox.tsx` | Viền chọn, chấm QuickLine, góc resize |
| `components/MarqueeOverlay.tsx` | Khung chọn |
| `components/FloatingObjectPreview.tsx`, `CanvasObjectDragPreview.tsx` | Preview nổi lúc kéo |
| `components/ContextMenu.tsx`, `ConfirmDialog.tsx`, `CanvasNotice.tsx` | Menu chuột phải, dialog xác nhận, thông báo ngắn |
| `components/CanvasHeader.tsx`, `BoardTitleRow.tsx`, `BreadcrumbList.tsx`, `HeaderPopups.tsx`, `HelpMenu.tsx` | Header |
| `components/objects/BoardObject.tsx` | Board tile |
| `components/UnsortPanel.tsx`, `UnsortItem.tsx` | Panel, tab, item Unsort |
| `components/Toolbar.tsx` | Nút thùng rác (phần còn lại ở `11`) |
| `engine/camera-engine.ts`, `camera.ts`, `coord.ts`, `pan-bounds.ts`, `grid-lod.ts` | Camera, toạ độ, giới hạn pan, lưới |
| `engine/alignment.ts` | Khớp cạnh lúc thả |
| `engine/actions.ts` | Mọi thao tác đổi dữ liệu + lệnh undo |
| `hooks/usePointerInteraction.ts` | Pan, khung chọn, bấm vùng trống |
| `hooks/useObjectDrag.ts`, `useEdgePan.ts` | Kéo object, kéo ra mép |
| `hooks/useUnsortDrag.ts`, `useUnsortMarquee.ts` | Kéo và khung chọn trong Unsort |
| `hooks/useBreadcrumbFit.ts` | Rút gọn breadcrumb |
| `hooks/useCanvasKeys.ts`, `shortcuts.ts` | Phím canvas (bảng phím ở `04`) |
| `store/selection-store.ts`, `interaction-store.ts`, `history-store.ts`, `unsort-store.ts`, `camera-store.ts`, `current-board-store.ts`, `boards-store.ts`, `canvas-drag-store.ts`, `notice-store.ts` | State giao diện |
| `lib/hit-test.ts`, `clipboard.ts`, `content-bounds.ts`, `slug.ts` | Vùng dưới con trỏ, clipboard, khung nội dung, slug (không dùng) |
| `src/lib/cursor-override.ts` | Con trỏ tạm |

## Nguồn liên quan

- `11-object-types.md` (khuôn loại, `INV-OBJ-*`), `20-local-data.md` (lưu board / camera / object, `useBoardSync`), `01-core.md` bước 7 (chặn zoom trang).
- Spec `.kiro/specs/canvas-unsort-multi-select/` (Task 5-7 chưa làm).
- `.kiro/notes/canvas-backlog.md` (QuickLine / Line, các tính năng chưa làm), `02-ui-common.md` mục "Lớp z" (tầng z screen-space).
- Bản cũ: `docs/legacy/canvas.md`, `docs/legacy/specs/canvas/`, `canvas-nested-boards/`, `canvas-unsort/`.

## Câu còn mở

Code khác doc cũ hoặc hành vi có thể chưa đúng:

- (Bạn chốt 2026-10-13) Xoá vào thùng rác KHÔNG hỏi lại là đúng ý: bấm thùng rác sẽ mở popup "đã xoá gần đây" để lấy lại. Popup này CHƯA làm (`canvas-backlog.md`). Hiện tại thùng rác / Ctrl+X chỉ xoá tile, board con + nội dung còn trong máy nhưng không còn đường vào; khi làm popup thùng rác phải quyết board con đi theo tile thế nào.
- (Bạn chốt 2026-10-13) Ctrl+D / dán board tile phải nhân bản cả board (board mới + chép nội dung, giống Milanote). CHƯA làm, cần spec riêng (`canvas-backlog.md`). Hiện vẫn ra 2 tile trỏ cùng 1 board.
- (2026-10-13) Kéo object không ở trên cùng = 2 bước undo (`bringToFront` + di chuyển). Đã có trong handoff mục hàng đợi ghi.
- (2026-10-13) Doc cũ (canvas US-3, US-6, US-7) ghi lăn chuột = zoom, resize 8 tay nắm. Code: lăn = pan, Ctrl + lăn = zoom; chỉ góc phải dưới, chỉ khi chọn 1. Chờ bạn chốt là đã đổi có chủ ý.
- (2026-10-13) Doc cũ (nested US-4, US-5, US-6) ghi URL có slug, id sai báo toast, Home ẩn hàng tiêu đề, gộp breadcrumb cố định "đầu + 2 cuối", sửa tên ở breadcrumb. Code: URL chỉ id (đổi 2026-10-02), id sai chuyển im lặng, hàng tiêu đề luôn hiện, gộp theo bề rộng thật, sửa tên ở hàng tiêu đề. Chờ bạn chốt là đã đổi có chủ ý (nếu đúng thì xoá `lib/slug.ts`).
- (2026-10-13) Doc cũ (unsort US-1) ghi bấm tab lần nữa để đóng panel. Code: tab ẩn khi panel mở, đóng bằng nút X / Esc. Chờ bạn chốt.

Việc nhỏ đã biết (không cần chốt):

- Chữ cứng chưa qua bộ dịch: "N cards" + `aria-label` "Vào board" (`BoardObject`), "Thêm Note" (`CanvasSurface`), nhãn nút thùng rác (`Toolbar`), `aria-label` "Breadcrumb" / "Hiện N cấp bị ẩn" (`BreadcrumbList`), "Untitled note" / phụ đề loại (`UnsortItem`). Thuộc `i18n` Task 5-7.
- Comment đầu `FloatingObjectPreview.tsx` còn ghi "không dùng cho canvas drag", lệch code (canvas drag đang dùng qua `CanvasObjectDragPreview`).
- Thời gian trượt vào chỗ khớp `SETTLE_MS = 120` là số cứng, chưa thành token chuyển động.
