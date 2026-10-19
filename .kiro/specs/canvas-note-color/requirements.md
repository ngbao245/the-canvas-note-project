# Yêu cầu — Popup Màu của Note (parity Milanote)

**Trạng thái**: Đã làm 2026-10-15
**Cập nhật cuối**: 2026-10-15

## Mục tiêu

Popup Màu của note hiện chỉ có Mặc định + 6 màu, chỉ tô thanh trên đầu note. Làm lại cho đủ như Milanote: 2 tab Background / Top strip, 13 màu chuẩn, hàng màu đi kèm màu chữ, hàng màu gợi ý, Custom color.

Bạn chốt 2026-10-15: làm đủ hết 1 đợt (câu 1A). Kiro đo Milanote thật qua MCP 2026-10-15, số liệu ở `design.md` mục "Đo Milanote".

## User stories

### US-1: 2 tab Background / Top strip
Là **người dùng**, tôi muốn **chọn tô màu cả nền note hoặc chỉ thanh trên đầu** để **phân loại note bằng màu theo kiểu mình thích**.

**Điều kiện chấp nhận**:
- Cho note đang chọn, khi mở popup Màu, thì đầu popup có 2 tab Background và Top strip, mỗi tab có icon + chữ, tab đang mở sáng hơn. Mở popup luôn ở tab Background.
- Cho tab Background, khi chọn 1 màu, thì nền cả note đổi sang màu đó.
- Cho tab Top strip, khi chọn 1 màu, thì chỉ thanh trên đầu note đổi màu, nền giữ nguyên.
- Cho note, khi đặt cả nền lẫn thanh, thì 2 màu cùng hiện (VD nền cyan + thanh đỏ).
- Cho popup đang mở, khi chọn màu, thì popup vẫn mở, tab giữ nguyên, ô vừa chọn có viền chọn.

### US-2: 13 màu chuẩn
Là **người dùng**, tôi muốn **có đủ bảng màu chuẩn** để **không bị giới hạn 6 màu**.

**Điều kiện chấp nhận**:
- Cho tab Background, khi xem, thì hàng đầu có 13 ô: không màu, xám, cyan, xanh lá, nâu, vàng, cam, đỏ, hồng, tím, xanh dương, xanh đậm, trong suốt.
- Cho tab Top strip, khi xem, thì hàng đầu có 12 ô: bỏ màu (ô gạch chéo đỏ) + 11 màu, không có ô trong suốt.
- Cho ô trong suốt, khi chọn, thì note không có nền (thấy lưới canvas phía sau), chữ vẫn đọc được.
- Cho ô không màu / bỏ màu, khi chọn, thì nền (hoặc thanh) về mặc định.
- Mỗi ô có tên màu khi rê chuột (qua bộ dịch).

### US-3: Hàng màu đi kèm màu chữ (ô chữ "A")
Là **người dùng**, tôi muốn **chọn sẵn cặp nền + màu chữ hợp nhau** để **note có màu mà chữ vẫn dễ đọc, đẹp**.

**Điều kiện chấp nhận**:
- Cho tab Background, khi xem, thì có hàng ô chữ "A": nền ô là màu nền, chữ "A" là màu chữ đi kèm.
- Cho 1 ô "A", khi chọn, thì nền note đổi sang màu nền đó và toàn bộ chữ note đổi sang màu chữ đi kèm.
- Cho note đã có màu chữ đi kèm, khi chọn lại 1 màu ở hàng đầu hoặc không màu, thì bỏ màu chữ đi kèm.
- Màu chữ riêng đặt trong Text style (mark trong body) vẫn thắng màu chữ đi kèm.
- Tab Top strip không có hàng này.

### US-4: Hàng màu gợi ý
Là **người dùng**, tôi muốn **có thêm 1 hàng màu dịu** để **chọn nhanh ngoài bảng chuẩn**.

**Điều kiện chấp nhận**:
- Cho tab Background và tab Top strip, khi xem, thì có hàng 7 màu gợi ý (không có chữ "A"), chọn thì áp như màu thường của tab đó.
- Bộ màu gợi ý theo theme: theme tối 1 bộ, theme sáng 1 bộ (số liệu ở `design.md`).

### US-5: Custom color
Là **người dùng**, tôi muốn **chọn màu tự do** để **dùng đúng màu thương hiệu / màu riêng**.

**Điều kiện chấp nhận**:
- Cho popup ở cả 2 tab, khi xem, thì cuối popup có nút "Custom color…" kèm vòng màu.
- Cho nút đó, khi bấm, thì mở ô chọn màu của trình duyệt, chọn xong áp màu cho tab đang mở (nền hoặc thanh).
- Cho nền màu tự chọn, khi hiển thị, thì chữ tự đổi đậm / nhạt cho dễ đọc (nền sáng → chữ tối, nền tối → chữ sáng).

### US-6: Chữ tự đọc được trên nền màu
Là **người dùng**, tôi muốn **chữ note luôn đọc được dù nền màu gì** để **không phải chỉnh màu chữ tay**.

**Điều kiện chấp nhận**:
- Cho note có nền màu sáng (VD vàng, cyan) mà không có màu chữ đi kèm, khi hiển thị, thì chữ chuyển sang màu tối. Nền tối thì giữ chữ sáng.
- Cho note đang sửa, khi gõ, thì màu chữ + con trỏ giống lúc xem (không nhảy màu khi đổi chế độ).

### US-7: Nút Màu trên toolbar xem trước màu hiện tại
Là **người dùng**, tôi muốn **nhìn nút Màu là biết note đang màu gì** để **khỏi mở popup**.

**Điều kiện chấp nhận**:
- Cho note có nền / thanh / màu chữ đi kèm, khi xem toolbar, thì icon nút Màu vẽ đúng nền + thanh (+ chữ "A" nếu có màu chữ đi kèm), giống Milanote.
- Cho note không màu, khi xem, thì icon giữ dạng mặc định.

### US-8: Giữ dữ liệu cũ + undo
Là **người dùng đã có note màu**, tôi muốn **note cũ giữ đúng màu** để **không mất công tô lại**.

**Điều kiện chấp nhận**:
- Cho note cũ có `color` (thanh trên đầu), khi mở app bản mới, thì note vẫn hiện thanh đúng màu (tab Top strip nhận ra màu đó).
- Cho mỗi lần chọn màu (nền, thanh, cặp, tự chọn), khi Ctrl+Z, thì về màu trước đó trong 1 bước.
- Cho F5, khi tải lại, thì nền, thanh, màu chữ đi kèm giữ nguyên.
- Cho tách đoạn ra note mới / dán note / Card Clipper copy note, khi tạo note mới, thì giữ cả nền + thanh + màu chữ đi kèm như note gốc.

## Phân loại

**Phải có**: US-1 đến US-8.
**Nên có**: không.

## Ngoài phạm vi

- Màu cho object khác (Board, Link, Image). Chỉ làm note.
- Lưu "màu tự chọn gần đây" thành hàng riêng. Milanote đo không thấy hàng nào đổi theo màu tự chọn.
- Đổi bảng màu chữ / tô nền trong Text style (giữ như `canvas-note-complete`).
- Phím tắt mở popup Màu.
