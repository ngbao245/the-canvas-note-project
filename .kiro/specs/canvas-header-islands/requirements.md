# Yêu cầu — Header canvas kiểu đảo nổi

**Trạng thái**: Nháp  
**Cập nhật cuối**: 2026-10-14

## Mục tiêu

Thử kiểu header mới theo mockup `mockups/04b-canvas.html` (đảo nổi, canvas tràn màn hình) mà vẫn giữ header 2 hàng hiện tại để so sánh. Bạn chuyển qua lại trong Cài đặt.

## Đã chốt (2026-10-14)

- Giữa 2 đảo: chỉ tên board (vẫn double-click đổi tên). Trạng thái lưu sang đảo trái, Chia sẻ + Xuất + % zoom sang đảo phải (câu 1B).
- Canvas tràn cả màn, 3 đảo nổi đè lên. Thanh công cụ trái và Khay chờ dời cho khỏi đụng đảo (câu 2A).
- Hai đảo giữ đúng bộ nút đang có, chỉ đổi cách bày. Không thêm, không bỏ nút (câu 3A).

## User stories

### US-1: Chọn kiểu header trong Cài đặt
Là **người dùng**, tôi muốn **chọn "Kiểu header: 2 hàng / Đảo nổi" trong Cài đặt → Canvas** để **so sánh 2 kiểu trên cùng dữ liệu**.

**Điều kiện chấp nhận**:
- Cho lần đầu mở app, thì kiểu header là "2 hàng" (như hiện tại, không ai thấy đổi gì).
- Cho đang ở canvas, khi đổi lựa chọn trong Cài đặt, thì header đổi ngay, không cần tải lại.
- Cho đã chọn "Đảo nổi", khi F5, thì vẫn là "Đảo nổi" (lưu trên máy).
- Cho bấm "Đặt lại mặc định" của mục Canvas, thì về "2 hàng".
- Cho giá trị lạ trong bộ nhớ máy, thì coi như "2 hàng".

### US-2: Header đảo nổi
Là **người dùng**, tôi muốn **header là 3 đảo nổi trên canvas** để **canvas rộng hơn, ít khung viền**.

**Điều kiện chấp nhận**:
- Đảo trái (góc trên trái): breadcrumb + trạng thái lưu / đồng bộ.
- Đảo giữa (chính giữa trên): tên board. Double-click đổi tên như cũ, Home không đổi tên được.
- Đảo phải (góc trên phải): số object, Undo / Redo, Trợ giúp, Tìm kiếm, Thông báo, Chia sẻ, Xuất, % zoom, avatar.
- Mỗi đảo: nền card hơi trong + mờ nền sau, viền `border`, bo góc, bóng nhẹ, cách mép màn 12px.
- Canvas chiếm cả màn hình; vùng giữa các đảo bấm / kéo / lăn xuống canvas bình thường.
- Mọi nút giữ nguyên hành vi, tooltip, phím tắt, popup như kiểu 2 hàng.
- Đảo phóng theo Kích thước giao diện như header cũ.
- Theme sáng và tối đều nhìn rõ (chỉ dùng token theme).

### US-3: Không đè nhau
Là **người dùng**, tôi muốn **các đảo không đè lên thanh công cụ, Khay chờ hay nhau** để **bấm được mọi thứ**.

**Điều kiện chấp nhận**:
- Thanh công cụ trái nằm dưới đảo trái, không chồng.
- Nút mở Khay chờ và panel Khay chờ nằm dưới đảo phải, không chồng.
- Màn hẹp: breadcrumb trong đảo trái tự rút như cũ; tên board ở đảo giữa tự cắt "…" trước khi đụng 2 đảo bên.
- Kéo object vào vùng đảo = vùng thả sai (con trỏ `not-allowed`, thả thì trả về chỗ cũ), như header cũ.

## Phân loại

**Phải có**: US-1, US-2, US-3.  
**Nên có**: không có.

## Ngoài phạm vi

- Dock trái, thanh thao tác nổi trên vùng chọn, ghi nhanh, minimap, Khay chờ dạng ngăn kéo, note nền màu nhạt của mockup.
- Đổi bộ nút (thêm nút theme, bỏ Thông báo...). Làm sau nếu bạn chọn giữ kiểu đảo.
- Dịch "Thoát edit" / "Bỏ chọn" trong thanh công cụ (việc của i18n Task 5-7).
- Xoá kiểu 2 hàng. Chỉ quyết sau khi bạn so xong.
- "Vừa nội dung" né vùng đảo: nội dung có thể nằm dưới đảo một chút. Ghi câu mở, làm sau nếu bạn thấy vướng.
