# Yêu cầu — Icon cho board tile (canvas-board-icon)

**Trạng thái**: Đã duyệt, đã code, chờ test tay
**Cập nhật cuối**: 2026-10-16

## Mục tiêu

Cho phép gắn một biểu tượng (icon) lên ô vuông của board tile trên canvas, để phân biệt board bằng hình thay vì chỉ màu. Nguồn icon: thư viện lucide (dùng chung với shadcn) hoặc ký tự tự nhập. Thay nút "Icon" đang để mờ trong toolbar board bằng một popup chọn icon thật.

## User stories

### US-1: Mở popup chọn icon
Là **người dùng canvas**, tôi muốn **bấm nút Icon trên toolbar khi chọn một board tile** để **mở popup chọn biểu tượng cho board đó**.

**Điều kiện chấp nhận**:
- Cho một board tile đang chọn, khi bấm nút Icon, thì popup chọn icon mở ra cạnh toolbar.
- Cho popup đang mở, khi bấm ra ngoài hoặc nhấn Escape, thì popup đóng.
- Cho nút Icon, khi board chưa có icon, thì nút hiện biểu tượng gợi ý trung tính; khi board đã có icon, thì nút hiện icon hiện tại của board.

### US-2: Chọn icon từ thư viện lucide
Là **người dùng canvas**, tôi muốn **duyệt và chọn một icon từ thư viện lucide** để **gắn lên board tile**.

**Điều kiện chấp nhận**:
- Cho popup mở ở nguồn "Thư viện", khi popup hiển thị, thì lưới icon hiện toàn bộ icon lucide, cuộn mượt kể cả khi số lượng lớn (không đứng hình khi mở).
- Cho lưới icon, khi tôi gõ vào ô tìm kiếm, thì lưới lọc theo tên hoặc tag của icon.
- Cho danh sách danh mục ở cột trái, khi tôi chọn một danh mục, thì lưới chỉ hiện icon thuộc danh mục đó.
- Cho một icon trong lưới, khi tôi bấm vào nó, thì icon được gắn lên board tile đang chọn và popup giữ nguyên (chọn tiếp được).
- Cho icon đang là icon hiện tại của board, khi lưới hiển thị, thì icon đó được đánh dấu đang chọn.

### US-3: Tự nhập ký tự làm icon
Là **người dùng canvas**, tôi muốn **gõ tối đa 2 ký tự** để **dùng ký tự đó làm biểu tượng board** (ví dụ "A1", chữ cái đầu, emoji).

**Điều kiện chấp nhận**:
- Cho popup, khi tôi chọn nguồn "Tự nhập", thì vùng phải hiện ô nhập ký tự kèm xem trước.
- Cho ô nhập, khi tôi gõ quá 2 ký tự, thì phần dư không được nhận.
- Cho ô nhập có nội dung, khi tôi xác nhận, thì ký tự được gắn lên board tile và hiển thị giữa ô vuông.
- Cho ô nhập rỗng, khi tôi xác nhận, thì không gắn gì (hoặc nút xác nhận không bấm được).

### US-4: Hiển thị icon trên board tile
Là **người dùng canvas**, tôi muốn **thấy icon đã chọn nằm giữa ô vuông board tile** để **nhận ra board bằng hình**.

**Điều kiện chấp nhận**:
- Cho board đã gắn icon lucide, khi tile hiển thị, thì icon vẽ giữa ô vuông 72x72, màu tương phản với màu nền ô vuông.
- Cho board đã gắn icon ký tự, khi tile hiển thị, thì ký tự vẽ giữa ô vuông, cỡ chữ đủ lớn để nhìn từ xa.
- Cho board chưa gắn icon, khi tile hiển thị, thì ô vuông chỉ có màu nền như hiện tại (không có icon).
- Cho board đã gắn icon, khi tải lại canvas, thì icon vẫn còn (được lưu lại).

### US-5: Gỡ icon
Là **người dùng canvas**, tôi muốn **gỡ icon đã gắn** để **đưa board về chỉ còn màu nền**.

**Điều kiện chấp nhận**:
- Cho board đã có icon, khi popup mở, thì có cách bỏ chọn (ví dụ bấm lại icon đang chọn, hoặc nút "Bỏ icon").
- Cho board, khi tôi gỡ icon, thì ô vuông tile trở lại chỉ còn màu nền.

## Phân loại

**Phải có (must-have)**: US-1, US-2, US-3, US-4, US-5
**Nên có (nice-to-have)**: không có cho phase này.

## Ngoài phạm vi

- Tải ảnh lên làm icon ("Upload an image" của Milanote): nguồn này để mờ, làm ở session sau.
- Bộ icon SVG riêng do người dùng tự quản lý (ngoài lucide): session sau.
- Quản lý icon tải lên (CRUD icon SVG): session sau.
- Đồng bộ icon lên server: thuộc canvas-sync, không làm ở đây.
