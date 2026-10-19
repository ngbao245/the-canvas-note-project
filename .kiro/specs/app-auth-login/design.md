# Thiết kế — Login modal (UI shell)

**Trạng thái**: Nháp

## Màn hình / luồng

### Route dev trống
- Một route riêng chỉ dùng để dev, nền trống theo theme (không có canvas, không header).
- Khi vào route, modal đăng nhập mở sẵn.
- Nếu đóng modal, nền vẫn trống và có một nút nhỏ giữa màn để mở lại modal (tiện test đóng/mở nhiều lần).

### Modal đăng nhập (overlay dùng chung)
- Nổi giữa màn hình, có nền mờ phía sau phủ toàn trang.
- Bố cục từ trên xuống:
  - Tiêu đề ngắn (ví dụ "Đăng nhập vào bibo") + mô tả 1 dòng.
  - Nút "Đăng nhập với Google": logo Google + chữ, chiếm hết chiều ngang.
  - Gạch ngăn ngang có chữ "hoặc" ở giữa.
  - Ô email: nhãn + ô nhập, báo lỗi dưới ô khi sai.
  - Ô mật khẩu: nhãn + ô nhập ẩn ký tự + nút con hiện/ẩn mật khẩu, báo lỗi dưới ô khi sai.
  - Nút đăng nhập chính: chiếm hết chiều ngang, có trạng thái đang xử lý.
  - Vùng báo lỗi chung (cho nhánh thất bại giả lập) đặt phía trên hoặc dưới nút chính.
  - Nút đóng (dấu X) ở góc.
- Chỉ ở dev: một nút gạt nhỏ cuối modal cho chọn nhánh kết quả giả lập (thành công / thất bại). Bản build ẩn.

### Luồng submit giả lập
1. Người dùng nhập email + mật khẩu, bấm đăng nhập (hoặc bấm Google).
2. Kiểm tra tại chỗ: email không trống + đúng dạng, mật khẩu không trống. Sai → hiện lỗi tại ô, dừng.
3. Hợp lệ → khoá form, nút chính hiện trạng thái đang xử lý, chờ khoảng 1 giây.
4. Theo nhánh đã chọn (hoặc mặc định):
   - Thành công: lưu cờ "đã đăng nhập (giả)" vào store, đóng modal.
   - Thất bại: mở khoá form, hiện thông báo lỗi mẫu trong modal.

## Dữ liệu

- Store UI (Zustand) điều khiển trạng thái mở/đóng modal: hàm mở, hàm đóng, cờ đang mở.
- Store xác thực (Zustand) giữ cờ "đã đăng nhập (giả)" cho phase này. Có thể persist localStorage để F5 giữ trạng thái, hoặc để trong bộ nhớ — quyết trong task.
- Không gọi mạng ở phase này. Trạng thái loading là hẹn giờ giả.
- Nhánh kết quả giả lập: trạng thái cục bộ trong modal (không cần persist).

## Tương tác với tool khác

- Modal mount ở gốc app (cạnh `SettingsModal`, `ShortcutsModal` trong `App.tsx`), mở qua store giống các modal toàn app hiện có.
- Phase này chưa nối canvas, chưa có nút nào trong canvas gọi mở. Route dev là nơi test duy nhất.

## Điều kiện biên

- Trống rỗng: không có.
- Lỗi kiểm tra tại chỗ: email sai dạng / ô trống → lỗi ngay dưới ô, không submit.
- Lỗi "từ server" (giả lập): hiện ở vùng lỗi chung, modal không đóng.
- Offline: phase này không gọi mạng nên không bị ảnh hưởng.
- Phím: Esc đóng modal; giữ Tab quẩn trong modal (bẫy tiêu điểm) theo chuẩn modal có sẵn trong app.
- Con trỏ, màu, chuyển động, chọn chữ, icon, chữ UI: theo luật chung của bibo (token theme, lucide, bộ dịch, modal layer sẵn có).

## Quyết định đã hoãn

- Dạng chính xác của OAuth Google thật (redirect hay popup) — khi nối Supabase.
- Persist cờ đăng nhập giả qua F5 hay không — quyết trong task đầu.
- Vị trí nút mở modal trong canvas và quy tắc gating — phase sau.
