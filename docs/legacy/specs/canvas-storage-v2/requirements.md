> LEGACY (chuyển 2026-10-13). Spec đã ship, chỉ còn là lịch sử thay đổi. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Task còn mở (nếu có) đã chép sang `.kiro/notes/backlog.md` / `canvas-backlog.md`.

# Yêu cầu — Lưu trữ canvas bản 2 (1 database + chỉ mục + render nhẹ)

**Trạng thái**: Chờ duyệt  
**Cập nhật cuối**: 2026-10-12

## Mục tiêu

Hiện canvas lưu ở 2 database IndexedDB riêng (`bibo-canvas-boards`, `bibo-canvas-objects`). Mở board phải đọc mọi object của mọi board rồi lọc. Mỗi phím gõ trong note làm cả canvas render lại. Mở 2 tab cùng lúc trên dữ liệu trống sinh 2 board "Home".

Spec này gộp về 1 database có nhiều store, đọc object theo board bằng chỉ mục, sửa render lại thừa, và khoá bước khởi động giữa các tab. Đây là nền để `canvas-sync` ghi outbox cùng transaction với object (`.kiro/notes/milanote-sync-architecture.md` mục 2.3, 2.5, 2.9, 2.10).

## Quyết định đã chốt (2026-10-12)

- IndexedDB thuần + lớp bọc nhỏ tự viết, không thêm thư viện. Bỏ `idb-keyval` (chỉ `api.ts` dùng).
- Dữ liệu cũ toàn là dữ liệu test: KHÔNG chuyển. Bản mới xoá 2 database cũ, dọn code chuyển đổi dữ liệu cũ.
- Phạm vi: gộp database + chỉ mục `boardId` + sửa render khi gõ + khoá bootstrap giữa tab (sửa lỗi 2 Home). Store `outbox` để `canvas-sync`.

## User stories

### US-1: Mở board chỉ đọc object của board đó
Là **người dùng**, tôi muốn **mở board nhanh dù tổng số object nhiều** để **chuyển board không phải chờ**.

**Điều kiện chấp nhận**:
- Cho có nhiều board, mỗi board nhiều object, khi mở 1 board, thì chỉ object của board đó được đọc (theo chỉ mục), không đọc object board khác.
- Cho board có 500 note, khi mở board, thì nội dung hiện dưới 500ms (đo DevTools, máy dev).
- Cho mở board, khi object đang chờ ghi xuống (hàng đợi), thì vẫn thấy bản mới nhất như hiện tại.

### US-2: Bỏ dữ liệu cũ, bắt đầu sạch
Là **người dùng đang có dữ liệu test**, tôi muốn **bản mới bắt đầu với canvas trống** để **không phải giữ code chuyển đổi cho dữ liệu không cần**.

**Điều kiện chấp nhận**:
- Cho máy có 2 database cũ, khi mở canvas bản mới lần đầu, thì 2 database cũ bị xoá và canvas mở với 1 board Home trống.
- Cho đã mở bản mới, khi F5, thì dữ liệu tạo sau khi lên bản mới còn nguyên.
- Cho máy không có database cũ, khi mở canvas, thì chạy bình thường, không báo lỗi.

### US-3: 2 tab mở cùng lúc chỉ có 1 Home
Là **người dùng mở canvas ở nhiều tab**, tôi muốn **mọi tab dùng chung 1 board Home** để **không bị tách ra 2 cây board khác nhau**.

**Điều kiện chấp nhận**:
- Cho dữ liệu trống, khi mở 2 tab canvas gần như cùng lúc, thì chỉ có 1 board Home, 2 tab ở cùng board đó.
- Cho 1 tab đang khởi động, khi tab khác mở, thì tab sau chờ tab trước xong rồi đọc lại, không tự tạo Home.
- Cho tab đang khởi động bị đóng giữa chừng, khi tab khác mở, thì vẫn khởi động được (khoá không treo).

### US-4: Gõ note không làm cả canvas render lại
Là **người dùng có board nhiều note**, tôi muốn **gõ và kéo mượt** để **không thấy trễ chữ hay giật khung hình**.

**Điều kiện chấp nhận**:
- Cho board 500 note, khi gõ trong 1 note, thì chỉ note đó render lại (React DevTools Profiler), mỗi phím phản hồi dưới 50ms.
- Cho board 500 note, khi kéo 1 object, thì giữ khoảng 60fps.
- Cho đổi thứ tự lớp (đưa lên trên / xuống dưới), khi xong, thì thứ tự hiển thị vẫn đúng như hiện tại.
- Cho object vào / ra Unsort, khi xong, thì canvas và Unsort vẫn hiện đúng như hiện tại.

### US-5: Camera không đè dữ liệu board
Là **người dùng**, tôi muốn **đổi tên board rồi pan / zoom ngay mà tên không bị mất** để **dữ liệu board không bị ghi đè bởi lần lưu camera**.

**Điều kiện chấp nhận**:
- Cho vừa đổi tên board, khi pan / zoom ngay sau đó rồi F5, thì tên mới còn.
- Cho pan / zoom board, khi F5, thì camera về đúng chỗ cũ như hiện tại.

### US-6: Hành vi lưu hiện có giữ nguyên
Là **người dùng**, tôi muốn **mọi thứ đã chạy vẫn chạy** để **đổi lưu trữ không làm hỏng tính năng cũ**.

**Điều kiện chấp nhận**:
- Note tự lưu, undo 1 bước mỗi lần sửa, trạng thái "Đang lưu / Đã lưu / Lưu lỗi", đẩy gấp khi ẩn tab, khoá giữa tab, tab khác thấy chữ mới: chạy như spec `canvas-note-autosave`.
- Cài đặt → Dữ liệu vẫn đếm đúng số board + object.
- Xoá board có board con vẫn xoá hết object bên trong.

## Phân loại

**Phải có**: US-1 đến US-6  
**Nên có**: không có

## Ngoài phạm vi

- Store `outbox`, gửi server, backend (spec `canvas-sync`).
- Chuyển dữ liệu từ 2 database cũ.
- Service worker / mở app khi offline.
- Đồng bộ board (đổi tên, tạo) giữa tab.
- Gọi `getHTML()` mỗi phím (rủi ro 3 ở mục 2.9): chỉ sửa nếu đo thấy vượt ngân sách.
