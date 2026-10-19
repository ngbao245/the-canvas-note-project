# Yêu cầu — Hoàn thiện màu board + màu icon (canvas-board-color-polish)

**Trạng thái**: Đã làm, chờ test tay
**Cập nhật cuối**: 2026-10-16

> ĐÃ BỎ (bạn chốt 2026-10-16): US-3 "Màu icon board" chỉnh riêng (field `iconColor`, khu "Màu biểu tượng" trong popup icon) đã gỡ vì trùng nút Màu. Màu icon giờ theo nền: ô trơn (phần 1) → icon trắng, ô chia chéo (phần 2) → icon đen, nền "Theo giao diện" → đen/trắng theo theme. Phần US-3 bên dưới và các mục tương ứng trong design/tasks chỉ là lịch sử.

## Mục tiêu

Sửa popup chọn màu board tile thành 3 phần rõ ràng (màu nền đậm / màu nền sáng / màu custom đã lưu) và cho user chọn màu riêng cho icon/logo ở giữa board, thay vì chỉ tương phản tự động.

## User stories

### US-1: Popup màu board 3 phần
Là **người dùng canvas**, tôi muốn **popup màu board chia 3 phần rõ** để **chọn màu dễ hơn**.

**Điều kiện chấp nhận**:
- Cho popup màu board, khi mở, thì phần 1 là dãy màu nền đậm (icon/chữ trên đó hiển thị trắng), phần 2 là dãy màu nền sáng (icon/chữ trên đó hiển thị đen), phần 3 là vùng màu custom.
- Cho mỗi ô màu, khi tôi bấm, thì nền board đổi màu đó ngay, popup vẫn mở, ô đang chọn có viền.

### US-2: Lưu màu custom
Là **người dùng canvas**, tôi muốn **màu custom tôi chọn được lưu lại** để **lần sau chọn lại nhanh**.

**Điều kiện chấp nhận**:
- Cho phần 3, khi tôi chọn một màu custom mới, thì màu đó được thêm vào dãy custom đã lưu và nền board đổi theo.
- Cho dãy custom đã lưu, khi tôi mở lại popup (kể cả board khác, kể cả sau khi tải lại trang), thì các màu custom đã lưu vẫn còn và bấm chọn lại được.
- Cho màu custom đã lưu, khi tôi chọn trùng màu đã có, thì không nhân đôi ô.

### US-3: Màu icon board
Là **người dùng canvas**, tôi muốn **chọn màu cho icon/logo ở giữa board** để **icon nổi bật theo ý tôi**.

**Điều kiện chấp nhận**:
- Cho board có icon, khi tôi mở chỗ chỉnh màu icon, thì có 3 nhóm lựa chọn: Tự động tương phản (mặc định), Tự động theo theme, và màu cố định (dãy màu + custom).
- Cho chế độ Tự động tương phản, khi hiển thị, thì màu icon theo độ sáng nền board (nền đậm → trắng, nền sáng → đen) như hiện tại.
- Cho chế độ Tự động theo theme, khi hiển thị, thì màu icon là đen ở theme sáng và trắng ở theme tối, bất kể màu nền board; đổi theme thì màu icon đổi theo.
- Cho chế độ màu cố định, khi tôi chọn một màu, thì icon luôn màu đó bất kể nền và theme.
- Cho board chưa chọn gì, khi hiển thị, thì mặc định là Tự động tương phản.
- Cho board đã chọn chế độ/màu icon, khi tải lại trang, thì lựa chọn vẫn còn.

## Phân loại

**Phải có**: US-1, US-2, US-3.

## Ngoài phạm vi

- Cặp màu nền+icon định sẵn 1 cú bấm (hàng "2 màu" Milanote): không làm, user chọn nền và màu icon riêng.
- Màu cho icon tải ảnh lên: session bộ icon sau.
