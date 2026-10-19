# Yêu cầu — Login modal (UI shell)

**Trạng thái**: Nháp
**Cập nhật cuối**: 2026-10-19

## Mục tiêu

Dựng giao diện đăng nhập cho bibo dưới dạng modal nổi (overlay), gọi được từ bất kỳ đâu trong app sau này (nổi trên canvas). Phase này CHỈ làm UI với submit giả lập, chưa nối Supabase Auth thật. Hướng sản phẩm: freemium — dùng thử thoải mái, chạm ngưỡng hoặc tính năng cần tài khoản mới bật modal này lên (logic ngưỡng để phase sau).

## User stories

### US-1: Mở modal đăng nhập để dev
Là **người phát triển**, tôi muốn **vào một route riêng chỉ hiện modal đăng nhập trên nền trống** để **tập trung làm giao diện modal mà không bị canvas che hay chi phối**.

**Điều kiện chấp nhận**:
- Cho tôi mở route đăng nhập, khi trang tải xong, thì modal đăng nhập hiện giữa màn hình trên một nền trống (không có canvas).
- Cho modal đang mở ở route đó, khi tôi đóng modal, thì nền vẫn trống (không điều hướng đi đâu), có cách mở lại modal.

### US-2: Modal là overlay dùng chung
Là **người phát triển**, tôi muốn **modal đăng nhập là một overlay điều khiển bằng store (mở/đóng)** để **sau này gọi mở ngay trên canvas mà không phải viết lại giao diện**.

**Điều kiện chấp nhận**:
- Cho app bất kỳ màn hình nào, khi gọi lệnh mở modal từ store, thì modal nổi lên trên nội dung đang có.
- Cho modal đang mở, khi gọi lệnh đóng từ store hoặc bấm nền mờ / nút đóng / phím Esc, thì modal đóng và nội dung phía dưới giữ nguyên.

### US-3: Form đăng nhập email + mật khẩu
Là **người dùng**, tôi muốn **nhập email và mật khẩu rồi bấm đăng nhập** để **vào tài khoản của mình**.

**Điều kiện chấp nhận**:
- Cho modal mở, khi tôi nhìn vào form, thì thấy ô email, ô mật khẩu (ẩn ký tự, có nút hiện/ẩn), và nút đăng nhập.
- Cho ô email hoặc mật khẩu bỏ trống hoặc email sai định dạng, khi tôi bấm đăng nhập, thì thấy báo lỗi tại ô tương ứng và không gọi submit.
- Cho cả hai ô hợp lệ, khi tôi bấm đăng nhập, thì nút chuyển sang trạng thái đang xử lý và khoá thao tác trong lúc chờ.

### US-4: Đăng nhập với Google
Là **người dùng**, tôi muốn **bấm một nút đăng nhập bằng Google** để **vào nhanh không cần nhớ mật khẩu**.

**Điều kiện chấp nhận**:
- Cho modal mở, khi tôi nhìn form, thì thấy nút "Đăng nhập với Google" với logo Google, tách khỏi khối email/mật khẩu bằng một gạch ngăn "hoặc".
- Cho tôi bấm nút Google, khi phase này còn giả lập, thì chạy đúng luồng giả lập giống nút đăng nhập thường (xem US-6).

### US-5: Giả lập hai nhánh kết quả
Là **người phát triển**, tôi muốn **một nút gạt trong modal để chọn trước kết quả giả lập là thành công hay thất bại** để **test được cả giao diện loading, lỗi và thành công mà chưa cần backend**.

**Điều kiện chấp nhận**:
- Cho modal mở, khi tôi nhìn (chỉ ở môi trường dev), thì thấy một nút gạt chọn nhánh kết quả (thành công / thất bại).
- Cho nút gạt đặt ở "thất bại", khi tôi submit (email/mật khẩu hoặc Google), thì sau lúc loading hiện thông báo lỗi mẫu trong modal, modal không đóng, form nhập lại được.
- Cho nút gạt đặt ở "thành công", khi tôi submit, thì sau lúc loading modal đóng và lưu một cờ "đã đăng nhập (giả)" vào store.
- Cho đây là bản build (không phải dev), khi modal hiện, thì nút gạt không xuất hiện (mặc định nhánh thành công).

### US-6: Trạng thái submit giả lập
Là **người dùng**, tôi muốn **thấy phản hồi rõ ràng khi bấm đăng nhập** để **biết hệ thống đang xử lý**.

**Điều kiện chấp nhận**:
- Cho tôi bấm đăng nhập (hợp lệ), khi đang chờ, thì nút hiện trạng thái đang xử lý khoảng 1 giây và mọi ô nhập / nút bị khoá.
- Cho hết thời gian chờ ở nhánh thành công, khi xử lý xong, thì modal đóng.
- Cho hết thời gian chờ ở nhánh thất bại, khi xử lý xong, thì hiện lỗi mẫu và mở khoá form.

### US-7: Chữ qua bộ dịch
Là **người dùng đổi ngôn ngữ**, tôi muốn **mọi chữ trong modal theo ngôn ngữ đang chọn** để **đọc đúng tiếng của mình**.

**Điều kiện chấp nhận**:
- Cho tôi đổi ngôn ngữ VI/EN, khi mở modal, thì mọi nhãn, placeholder, thông báo lỗi, chữ nút đổi theo ngôn ngữ.

## Phân loại

**Phải có (must-have)**: US-1, US-2, US-3, US-4, US-6, US-7
**Nên có (nice-to-have)**: US-5 (nút gạt test; nếu rút gọn thì mặc định luồng có thể cấu hình bằng hằng số dev)

## Ngoài phạm vi

- Nối Supabase Auth thật (OAuth Google thật, email/password thật) — phase sau.
- Logic gating: khi nào bắt buộc đăng nhập, ngưỡng dùng thử — phase sau.
- Đăng ký tài khoản, quên mật khẩu, xác thực email.
- Lưu phiên đăng nhập thật, refresh token, đăng xuất thật (phase này chỉ cờ giả trong store).
- Hiển thị trạng thái đã đăng nhập ở nơi khác trong app (avatar, menu tài khoản) — chỉ lưu cờ, chưa vẽ.
