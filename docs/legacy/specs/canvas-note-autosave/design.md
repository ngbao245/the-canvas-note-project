> LEGACY (chuyển 2026-10-13). Spec đã ship, chỉ còn là lịch sử thay đổi. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Task còn mở (nếu có) đã chép sang `.kiro/notes/backlog.md` / `canvas-backlog.md`.

# Thiết kế — Note tự lưu + Ctrl+Enter tạo note mới

**Trạng thái**: Đã duyệt (2026-10-09)

## Màn hình / luồng

Không có màn hình mới. Đổi hành vi trong lúc sửa note trên canvas:

- **Đang sửa note**: mỗi lần gõ, nội dung được đưa vào hàng đợi ghi. Chữ "Đang lưu… / Đã lưu / Lưu lỗi" ở tiêu đề board dùng lại cơ chế có sẵn (chỉ hiện "Đang lưu…" khi ghi lâu hơn 300ms, nên gõ bình thường không nháy chữ).
- **Thoát sửa** (Esc, click ra ngoài): đẩy phần đang chờ đi ngay, ghi 1 bước undo (trước khi sửa → nội dung cuối), nhả khoá note.
- **Ctrl+Enter**: như thoát sửa, rồi tạo note mới ngay bên dưới và vào sửa note mới.
  - Vị trí: cùng cạnh trái với note cũ, cạnh trên = cạnh dưới note cũ + 16px (khoảng gần bằng Milanote, chỉnh được sau). Kích thước, màu mặc định như note tạo từ toolbar.
  - Note mới nằm trên cùng board, không qua khay Unsort.
- **Tab B double-click note tab A đang sửa**: không vào sửa, hiện thông báo ngắn "Note đang được sửa ở tab khác" (qua bộ dịch, vi + en).

## Dữ liệu

### Hàng đợi ghi (kiểu Google Docs)

Một hàng đợi duy nhất nằm giữa store và IndexedDB, mọi lệnh ghi object đều đi qua (gồm cả kéo, resize, đổi màu, không riêng note):

- Mỗi thay đổi đăng ký theo khoá **(object, kênh)**. Kênh có 2 loại: `chữ` (nội dung note) và `thuộc tính` (vị trí, kích thước, màu, các trường khác). Bây giờ ghi xuống IndexedDB vẫn là cả object; tách kênh để sau này lên Yjs chỉ thay kênh `chữ`, và để `canvas-sync` biết kênh nào cần gửi.
- Mỗi lúc chỉ **1 lần ghi đang chạy**. Thay đổi mới trong lúc đó gom vào nhóm "đang chờ"; cùng 1 object thì chỉ giữ bản mới nhất.
- Ghi xong mà còn "đang chờ" thì ghi tiếp ngay. Ngừng gõ thì dừng. Không dùng debounce.
- **Đẩy ngay** phần đang chờ khi: thoát sửa, Ctrl+Enter, đổi board, tab bị ẩn (`visibilitychange`), tab đóng (`pagehide`).
- Ghi lỗi (quota, IndexedDB hỏng): báo "Lưu lỗi" qua trạng thái lưu có sẵn, giữ thay đổi trong nhóm "đang chờ" để thử lại ở lần ghi sau.
- Kèm lợi ích phụ: kéo object hiện ghi IndexedDB mỗi pointermove, qua hàng đợi sẽ tự gộp còn rất ít lần ghi.

Rủi ro còn lại (chấp nhận): mất điện / hệ điều hành sập đúng lúc đang ghi thì mất lần ghi cuối (vài chục ms). Tab hoặc trình duyệt treo thì không mất phần đã ghi.

### Trường `version` trên object

- Thêm số nguyên `version` vào object, tăng 1 mỗi lần object được ghi xuống. Object cũ trong IndexedDB chưa có trường này thì đọc ra là 0 (schema có giá trị mặc định), không cần bước chuyển dữ liệu riêng.
- Bây giờ chỉ để ghi lại. `canvas-sync` dùng để phát hiện xung đột và tạo bản xung đột.

### Undo

- Gõ trong lúc sửa: cập nhật store + đưa vào hàng đợi, **không** thêm bước undo (giống cách kéo / resize đang làm: thay đổi trực tiếp không ghi lịch sử, chỉ ghi 1 bước lúc kết thúc).
- Thoát sửa: ghi 1 bước undo với "trước" = nội dung lúc vào sửa, "sau" = nội dung cuối. Không đổi gì thì không ghi.
- Ctrl+Enter: 1 bước cho lần sửa note cũ (nếu có đổi) + 1 bước tạo note mới.

### Khoá note giữa các tab

- Dùng Web Locks API của trình duyệt: vào sửa note thì xin khoá theo id note (không chờ, có thì lấy, không có thì báo bận). Thoát sửa thì nhả. Tab đóng / treo / crash thì trình duyệt tự nhả khoá, nên không bị khoá treo.
- Báo tab khác nội dung mới: dùng BroadcastChannel. Ghi xong 1 object thì phát id object đó; tab khác nhận được thì đọc lại object từ IndexedDB và cập nhật store (không thêm bước undo, không ghi lại xuống IndexedDB).
- Trình duyệt không có Web Locks (rất cũ): cho sửa bình thường, không khoá (cảnh báo trong console bằng `console.warn`).
- Note đang bị khoá ở tab khác thì tab này không kéo, resize, đổi màu, xoá được note đó (ghi xuống là cả object, bản của tab này có thể mang chữ cũ).

### Rủi ro chấp nhận

- Undo ở tab B có thể hồi chữ cũ: lịch sử undo của tab B còn bản cũ của note X, tab A sửa xong rồi tab B bấm Ctrl+Z thì đè chữ của tab A. Hiếm, chấp nhận. Xử triệt để (so `version` trước khi undo) để `canvas-sync`.

## Tương tác với tool khác

- Hàng phím tắt hiển thị trong modal phím tắt: sửa nghĩa Ctrl+Enter trong note.
- Không đụng tool khác.

## Điều kiện biên

- Note bị xoá (undo tạo, xoá từ tab khác) trong lúc còn trong hàng đợi: bỏ mục đó, không ghi lại object đã xoá.
- Xoá object: lệnh xoá cũng đi qua hàng đợi, đứng sau lệnh ghi cùng object để không "hồi sinh" object đã xoá.
- Đổi board khi đang sửa: đẩy hàng đợi trước, rồi mới nạp board mới.
- Bộ gõ tiếng Việt đang ghép chữ: tự lưu theo nội dung editor sau mỗi thay đổi, không ảnh hưởng ghép chữ.
- Offline: không liên quan (chỉ ghi trên máy).

## Quyết định đã hoãn

- Lưu theo từng thuộc tính (A đổi màu, B kéo vị trí cùng lúc) → `canvas-sync`.
- Gộp hàng đợi gửi server vào cùng transaction với object (cần đổi idb-keyval 2 database thành 1 database nhiều store) → `canvas-sync`.
- Khoảng cách note mới khi Ctrl+Enter (16px) có thể chỉnh sau khi bạn dùng thử.
