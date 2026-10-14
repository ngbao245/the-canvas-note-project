> LEGACY (chuyển 2026-10-13). Spec đã ship, chỉ còn là lịch sử thay đổi. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Task còn mở (nếu có) đã chép sang `.kiro/notes/backlog.md` / `canvas-backlog.md`.

# Thiết kế — Lưu trữ canvas bản 2

**Trạng thái**: Nháp

## Màn hình / luồng

Không có màn hình mới. Người dùng chỉ thấy: lần đầu lên bản mới canvas trống, mở board nhanh hơn, gõ mượt hơn.

Luồng khởi động canvas:
1. Xin khoá khởi động chung giữa các tab (Web Lock, chờ được thì làm).
2. Có 2 database cũ thì xoá (chỉ làm 1 lần, không có thì bỏ qua).
3. Đọc danh sách board. Chưa có Home thì tạo.
4. Nhả khoá, báo sẵn sàng. Tab sau giữ khoá thì thấy Home đã có, không tạo thêm.

Luồng mở board: đọc object theo chỉ mục `boardId` + camera của board đó, gộp với phần đang chờ ghi trong hàng đợi (như hiện tại).

Render canvas: lớp danh sách chỉ theo dõi danh sách id object trên canvas (đã lọc Unsort, đã sắp theo lớp). Mỗi object tự đọc dữ liệu của mình theo id. Gõ trong note chỉ đổi dữ liệu note đó → danh sách id không đổi → chỉ note đó render lại. Danh sách chỉ tính lại khi thêm / xoá / đổi lớp / vào ra Unsort.

## Dữ liệu

1 database `bibo-canvas`, phiên bản 1:

| Store | Khoá | Chỉ mục | Chứa |
|---|---|---|---|
| boards | id | — | Board (không còn camera) |
| objects | id | boardId | CanvasObject |
| cameras | boardId | — | Camera của từng board (nhóm C, UI state) |

- Lớp bọc nhỏ tự viết quanh IndexedDB: mở database + tạo store, chạy 1 transaction trên 1 hoặc nhiều store, đổi request thành promise. Không thêm thư viện.
- Ghi object theo lô vẫn 1 transaction (như hiện tại). Sau này outbox thêm vào cùng database, ghi cùng transaction.
- Đọc danh sách board: đọc boards + cameras rồi gắn camera vào board, nên phần còn lại của app vẫn thấy board có camera như cũ. Lưu board không ghi camera; lưu camera chỉ ghi store cameras → 2 bên không đè nhau.
- Đếm (Cài đặt → Dữ liệu): đếm bằng `count()` của store, không đọc nội dung.
- `version` giữ như cũ (hàng đợi đóng dấu). Bỏ phần đọc object thiếu `version` vì không còn dữ liệu cũ.
- Bỏ: 2 database cũ, `idb-keyval`, code chuyển đổi dữ liệu cũ (object `boardId: null`, sửa `parentId` / tên Home của board cũ). Giữ phần tìm Home (board không có cha).

## Tương tác với tool khác

- Cài đặt → Dữ liệu dùng hàm đếm của canvas, giữ cùng kết quả.
- Landing demo độc lập, không đụng.

## Điều kiện biên

- Trình duyệt không có Web Lock: khởi động không khoá (như hiện tại), chấp nhận rủi ro 2 Home. Web Lock có trên mọi trình duyệt app nhắm tới.
- Xoá database cũ bị chặn (tab bản cũ còn mở giữ kết nối): không chờ, bỏ qua, lần mở sau thử lại. Không chặn khởi động.
- Mở database lỗi (hết dung lượng, chế độ riêng tư chặn): hiện màn hình lỗi canvas như hiện tại.
- Database phiên bản mới hơn (mở bản app cũ sau bản mới): báo lỗi, không xoá dữ liệu.
- Tab khác nâng phiên bản database: tab đang mở đóng kết nối, báo cần tải lại (để sau khi có outbox; hiện chỉ có phiên bản 1).

## Đo hiệu năng

Board giả lập 500 note (Kiro đưa đoạn lệnh dán vào DevTools console để tạo, không thêm vào code app). Ngân sách theo `milanote-sync-architecture.md` mục 2.9:
- Gõ: mỗi phím dưới 50ms, Profiler chỉ thấy note đang gõ render.
- Kéo: khoảng 60fps.
- Mở board 500 object: dưới 500ms.

## Quyết định đã hoãn

- Cấu trúc store `outbox` + `schemaVersion` của mục outbox: `canvas-sync`.
- Sửa `getHTML()` mỗi phím: chỉ khi đo vượt ngân sách.
