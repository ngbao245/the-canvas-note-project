# Task — Lưu trữ canvas bản 2

**Trạng thái**: Đã duyệt (2026-10-11, bạn chốt bỏ hết dữ liệu cũ). Task 1-2 test pass 2026-10-12. Task 3 test pass 2026-10-12. Spec XONG.

## Phase 1: Database mới + khởi động

- [x] Task 1: 1 database `bibo-canvas` (boards, objects có chỉ mục boardId, cameras) + bỏ dữ liệu cũ
  - Đã làm: `lib/idb.ts` (lớp bọc), `api.ts` viết lại adapter, xoá `lib/board-tree.ts`, gỡ `idb-keyval`. Phiên bản database là 2 (không phải 1 như design): phòng máy còn database `bibo-canvas` phiên bản 1 rất cũ, nâng từ < 2 thì xoá store cũ tạo lại.
  - File: `src/tools/canvas/lib/` (lớp bọc IndexedDB, pure), `src/tools/canvas/api.ts` (adapter mới, xoá 2 database cũ, camera ghi store riêng, đếm bằng count), `src/tools/canvas/lib/board-tree.ts` + `hooks/useCanvasBootstrap.ts` (bỏ code chuyển đổi dữ liệu cũ), `package.json` (bỏ `idb-keyval`)
  - Verify: máy có 2 database cũ → mở canvas → DevTools Application chỉ còn `bibo-canvas` với 3 store, canvas trống có Home; tạo note / board, kéo, đổi tên, F5 → còn đủ; đổi tên board rồi pan ngay, F5 → tên còn; mở board chỉ đọc qua chỉ mục (đặt breakpoint / đọc code); Cài đặt → Dữ liệu đếm đúng; xoá board có con → object con mất hết; chạy lại test A1-A10 của `canvas-note-autosave`.

- [x] Task 2: Khoá khởi động giữa tab (sửa lỗi 2 Home)
  - Làm cùng lượt Task 1: thử Task 1 thấy 1 tab cũng tạo 2 Home (StrictMode chạy bootstrap 2 lần). Web Lock `bibo-canvas-bootstrap` bọc đọc + tạo Home.
  - File: `src/tools/canvas/hooks/useCanvasBootstrap.ts`
  - Verify: xoá database `bibo-canvas`, mở 2 tab canvas cùng lúc → 1 Home, 2 tab cùng board (so id trên URL / breadcrumb); mở 1 tab rồi đóng ngay giữa lúc tải, mở tab khác → vào được.

### Test tay Task 1-2 (ghi 2026-10-12)

Chuẩn bị: DevTools → Application → IndexedDB.

- E1. Mở `/canvas` → có Home, canvas trống. IndexedDB chỉ còn `bibo-canvas` (không còn `bibo-canvas-boards` / `bibo-canvas-objects`). Mở `bibo-canvas` thấy 3 store `boards`, `cameras`, `objects`; `objects` có chỉ mục `boardId`.
- E2. Tạo 2 note, gõ chữ, đổi màu 1 note, F5 → còn đủ chữ + màu.
- E3. Kéo note sang chỗ khác, resize note, F5 → đúng vị trí + cỡ mới.
- E4. Tạo board con, vào board con, tạo 1 note, quay về Home, F5 → board con còn, vào lại thấy note.
- E5. Pan + zoom ở Home, F5 → camera giữ đúng chỗ + mức zoom. Vào board con pan chỗ khác, quay về Home → Home vẫn camera cũ (mỗi board 1 camera).
- E6. Đổi tên board con rồi pan ngay trong board đó, F5 → tên mới còn (trước đây camera có thể đè mất tên).
- E7. Cài đặt → Dữ liệu → số board (tính cả Home) và số object khớp với những gì đã tạo.
- E8. Xoá board con có note bên trong → Cài đặt → Dữ liệu: số object giảm đúng; store `cameras` không còn dòng của board đó.
- E9. Kéo note vào Unsort, F5 → note vẫn trong Unsort. Kéo ra lại canvas, F5 → về canvas.
- E10. Undo / redo sau khi tạo, kéo, xoá note → đúng; F5 → trạng thái cuối giữ đúng.
- E11. Chuột phải `bibo-canvas` → Delete database, mở 2 tab `/canvas` gần như cùng lúc → store `boards` chỉ có 1 Home, 2 tab cùng id board.
- E12. Xoá database, mở 1 tab rồi đóng ngay khi đang tải, mở tab mới → vào được, có 1 Home.
- E13. 2 tab cùng board: tab A tạo / sửa note → tab B thấy cập nhật (đồng bộ giữa tab vẫn chạy). Khoá + badge vẫn như cũ.
- E14. Chạy lại A1-A10 của `canvas-note-autosave` (tự lưu, F5 giữa lúc kéo, thả mới tính).

Kết quả (2026-10-12): pass hết. E9 thêm yêu cầu: số Unsort hiện "0" rồi nhảy sang số thật → đã sửa, đang tải thì hiện vòng xoay (`objects-store.loadedBoardId`, `UnsortCount` trong `UnsortPanel.tsx`); panel đang tải không hiện "chưa có gì". Cần test lại: E9b.
- E9b. Board có note trong Unsort, F5 và chuyển qua lại board → nút Unsort + số trong panel hiện vòng xoay ngắn rồi ra số đúng, không hiện "0" trước.
Unsort tách theo board: bạn kiểm lại 2026-10-12, là hành vi đúng, không phải lỗi.

## Phase 2: Render nhẹ khi gõ

- [x] Task 3: Lớp object chỉ theo dõi danh sách id, mỗi object tự đọc theo id + đo trên board 500 note
  - Đã làm: `ObjectsLayer` theo dõi danh sách id (`useShallow`), `ObjectView` memo + tự đọc object theo id. Thêm 2 chỗ ngoài design vì cũng render lại mỗi phím: `CanvasSurface` (theo dõi cả Map để tính biên pan → đổi sang `subscribe`, không render lại) và `CanvasObjectDragPreview` (chỉ theo dõi object đang kéo). Toolbar / UnsortPanel vẫn theo dõi cả Map (1 component, rẻ), để sau nếu đo thấy chậm.
  - Đo bằng MCP (bản dev, 500 note, 2026-10-12): đọc IndexedDB 9ms + render 257ms; đổi chữ / vị trí 1 note 4-7ms; gõ thật trong editor: độ trễ phím trung vị 16ms, cao nhất 32ms. Kéo 60fps chưa đo bằng số, cần bạn thử tay.
  - Test tay (bạn): F1 gõ / kéo / resize note bình thường; F2 đưa lên trên / xuống dưới đúng lớp; F3 vào / ra Unsort, undo / redo đúng; F4 xoá note, dán, nhân bản hiện đúng; F5 kéo note ra sát mép, pan / zoom tối thiểu vẫn ôm đủ nội dung; F6 chạy lại B + C của `canvas-note-autosave`.
  - File: `src/tools/canvas/components/ObjectsLayer.tsx` (có thể thêm selector trong `store/objects-store.ts`)
  - Verify: dán đoạn lệnh tạo 500 note; React Profiler khi gõ chỉ thấy note đang gõ render; mỗi phím dưới 50ms; kéo khoảng 60fps; mở board dưới 500ms; đưa lên trên / xuống dưới, vào / ra Unsort, undo / redo vẫn đúng; chạy lại test B + C của `canvas-note-autosave`.

## Định nghĩa "xong" (paste khi báo task hoàn thành)

```
[ ] npm run build pass
[ ] npm run lint pass
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] Nếu đổi behavior: doc/spec liên quan đã update
```
