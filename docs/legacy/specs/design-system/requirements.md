> LEGACY (chuyển 2026-10-13). Spec đã ship, chỉ còn là lịch sử thay đổi. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Task còn mở (nếu có) đã chép sang `.kiro/notes/backlog.md` / `canvas-backlog.md`.

# Requirements — Design System

## Bối cảnh

App cần một design system dùng chung đi suốt toàn hệ thống. Hiện có 2 nguồn token lệch nhau: app React (primary gần đen, shadcn mặc định) và mockup HTML (primary xanh #007acc, nền kiểu VS Code, Plus Jakarta Sans). Cần hợp nhất về một nguồn token duy nhất.

Trên nền token đó, app hỗ trợ 2 phong cách hiển thị mà người dùng chọn được:
- Vẽ tay (drawably) — mặc định.
- Phẳng (shadcn theme theo token) — phương án thay thế.

Cả 2 phong cách dùng chung một bảng token, nên đổi màu một chỗ là cả hai đổi theo.

## Quyết định đã chốt (không hỏi lại)

- Người dùng đổi phong cách bằng toggle trong app, lưu localStorage. Chưa cần backend.
- Bảng token lấy mockup `shared.css` làm gốc, rà cho đủ cặp foreground và token app đang thiếu rồi chốt.
- Không bật font vẽ tay (Drawably Pen) ở giai đoạn này. Chữ vẫn Plus Jakarta Sans. Tính sau.
- Thành phần drawably không có (dialog, dropdown, popover, toast, command palette, table, skeleton, empty/error state, progress, avatar, drop zone): dùng shadcn theme theo token chung. Chấp nhận chúng phẳng hơn phần vẽ tay.
- Phong cách vẽ tay = drawably (control chính) + shadcn đã theme (phần drawably thiếu). Không có thư viện nào lo hết một mình.
- Phong cách phẳng = shadcn thuần đã theme, không nét vẽ tay.

## User Stories

### US-1: Token màu thống nhất, nhiều theme
Với tư cách người phát triển, tôi muốn cả app dùng chung một bảng token màu theo trục theme, để đổi màu một chỗ là toàn app đổi theo, và dễ thêm theme mới sau này.

Trục theme (chỉ đổi màu): mỗi theme là một bảng màu đặt tên, ngang hàng nhau. Hiện có dark và light. Sau này thêm purple, cute... Chọn theme bằng thuộc tính data-theme trên phần tử gốc, mặc định dark. Trục phong cách (vẽ tay/phẳng) độc lập với theme.

Tiêu chí chấp nhận:
- Given app đang chạy, When xem bất kỳ màn hình nào, Then màu primary là xanh #007acc (không phải đen shadcn mặc định).
- Given data-theme là dark hoặc light, When đổi giá trị, Then mọi màu nền, chữ, viền đổi theo đúng bảng token của theme đó.
- Given một token màu được sửa ở nguồn duy nhất, When app render lại, Then mọi chỗ dùng token đó đổi theo, không sót chỗ hard-code.
- Given bảng token, Then đủ các cặp foreground cho mỗi surface (background, card, popover, muted, primary, destructive, success, warning) và các token phụ mockup có (card-elevated, border-strong, subtle-foreground, primary-soft, shadow, primary-hover).
- Given muốn thêm theme mới, When sao chép một khối token và đổi tên + giá trị màu, Then theme mới hoạt động mà không phải đụng cấu trúc chỗ khác.

Giai đoạn này chỉ làm dark + light, chuẩn bị cấu trúc cho theme sau. Chưa cần nút chọn theme.

### US-2: Motion token
Với tư cách người phát triển, tôi muốn có token thời lượng và easing chuẩn, để mọi hiệu ứng chuyển động nhất quán.

Tiêu chí chấp nhận:
- Given app, Then có token duration nhanh (60ms), bình thường (200ms), và easing chuẩn (cubic-bezier 0.4, 0, 0.2, 1).
- Given một transition bất kỳ, When không có lý do đặc biệt, Then dùng easing chuẩn.

### US-3: Chọn phong cách hiển thị
Với tư cách người dùng, tôi muốn chọn giữa phong cách vẽ tay và phẳng, để dùng giao diện hợp gu mình.

Tiêu chí chấp nhận:
- Given lần đầu mở app, When chưa từng chọn, Then phong cách mặc định là vẽ tay.
- Given người dùng đổi phong cách, When chọn xong, Then giao diện đổi ngay không cần tải lại trang.
- Given người dùng đã chọn phong cách, When đóng và mở lại app, Then giữ đúng phong cách đã chọn (lưu localStorage).
- Given phong cách vẽ tay, Then các control chính (button, card, badge, input, checkbox...) hiển thị nét vẽ tay drawably.
- Given phong cách phẳng, Then các control hiển thị dạng phẳng shadcn, cùng bảng màu.

### US-4: Token chung cho cả hai phong cách
Với tư cách người phát triển, tôi muốn phong cách vẽ tay lấy màu từ token chung, để không phải chỉnh màu drawably rời rạc.

Tiêu chí chấp nhận:
- Given phong cách vẽ tay, Then biến drawably (nét, tô, giấy) ánh xạ từ token chung (nét theo primary, giấy theo background), không hard-code màu rời.
- Given đổi theme dark/light, When ở phong cách vẽ tay, Then nét và giấy drawably đổi theo token, không cần set tay từng chỗ.

### US-5: Thành phần dùng chung theo phong cách
Với tư cách người phát triển, tôi muốn các thành phần drawably không có (dialog, dropdown, skeleton, toast, empty/error state...) được theme theo token chung, để chúng hợp bảng màu dù phẳng hơn.

Tiêu chí chấp nhận:
- Given phong cách vẽ tay, When app hiển thị dialog/dropdown/skeleton/toast, Then chúng dùng shadcn theme theo token chung (không lệch màu).
- Given rule dự án bắt buộc skeleton khi chờ data, Then có sẵn thành phần loading/empty/error dùng chung, theme theo token.

## Ngoài phạm vi (giai đoạn này)

- Font vẽ tay Drawably Pen (tính sau).
- Lưu lựa chọn phong cách vào backend/tài khoản (chưa có backend).
- Chuyển toàn bộ tool cũ sang design system mới (chỉ nền tảng; áp dụng dần khi dựng tool thật).
- Bê nguyên CSS mockup vào app (mockup chỉ là tham chiếu hình ảnh).

## Must-have vs Nice-to-have

Must-have: US-1, US-2, US-3, US-4.
Nice-to-have giai đoạn này: US-5 (có thể dựng dần khi tool thật cần từng thành phần).
