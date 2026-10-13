# Yêu cầu — Canvas demo trên landing

**Trạng thái**: Đã duyệt  
**Cập nhật cuối**: 2026-10-10

## Mục tiêu

Người xem landing thử được một canvas mẫu ngay trên trang (kéo, sửa note, zoom, xem một ví dụ truy nguồn) mà không cần tài khoản. Bên dưới là phần giới thiệu vẽ kiểu ký họa, kể vì sao bibo tồn tại.

Lựa chọn đã chốt với bạn:
- Demo **độc lập hoàn toàn** với canvas thật: không sửa, không import code trong `src/tools/canvas/`, không đọc / ghi dữ liệu canvas.
- 1B: demo có note + một ví dụ truy nguồn dựng sẵn.
- 2B: màn hình hẹp thay demo bằng ảnh tĩnh + lời nhắn mở trên máy tính.
- 3A: không lưu, tải lại là về board mẫu.

## User stories

### US-1: Thử canvas ngay trên landing
Là **người lần đầu vào trang**, tôi muốn **thao tác trên một canvas mẫu ngay đầu trang** để **hiểu bibo làm gì mà không phải đọc**.

**Điều kiện chấp nhận**:
- Cho landing vừa mở trên máy tính, khi nhìn phần đầu trang, thì thấy một canvas mẫu đã có sẵn vài note và một trích dẫn có nguồn.
- Cho canvas mẫu đã bật, khi kéo note, chọn note, bấm đúp để sửa chữ, thì note phản hồi ngay.
- Cho canvas mẫu đã bật, khi kéo một note mới từ thanh công cụ ra mặt canvas, thì note mới xuất hiện ở chỗ thả.
- Cho canvas mẫu đã bật, khi lăn chuột có Ctrl / pinch trackpad, thì zoom quanh con trỏ. Khi kéo vùng trống, thì pan.
- Cho canvas mẫu đã bật, khi Ctrl+Z / Ctrl+Y (Cmd trên Mac) hoặc bấm nút Undo / Redo, thì hoàn tác / làm lại thao tác tạo, kéo, sửa, xoá.
- Cho một note đang chọn, khi nhấn Delete, thì note bị xoá.
- Cho canvas mẫu, khi bấm "Mở bản đầy đủ", thì sang `/canvas`.

### US-2: Cuộn trang không bị canvas giành
Là **người đang cuộn landing**, tôi muốn **lăn chuột ngang qua canvas mẫu mà trang vẫn cuộn** để **không bị kẹt giữa trang**.

**Điều kiện chấp nhận**:
- Cho canvas mẫu chưa bật, khi lăn chuột trên nó, thì trang cuộn bình thường, canvas không zoom, không pan.
- Cho canvas mẫu chưa bật, khi nhìn vào, thì thấy lớp phủ nhẹ kèm lời mời "Bấm để thử".
- Cho canvas mẫu chưa bật, khi bấm vào, thì lớp phủ biến mất, canvas nhận chuột và phím tắt.
- Cho canvas mẫu đang bật, khi nhấn Esc lúc không sửa chữ và không có panel mở, hoặc bấm ra ngoài khung, thì canvas về trạng thái chưa bật.
- Cho canvas mẫu chưa bật, khi Tab tới khung rồi nhấn Enter, thì canvas bật giống như bấm chuột.
- Cho canvas mẫu chưa bật, khi nhấn Ctrl+Z hay Delete ở chỗ khác trên trang, thì demo không phản ứng.

### US-3: Không đụng canvas thật
Là **chủ dự án đang dùng canvas thật**, tôi muốn **demo tách hẳn khỏi canvas của tôi** để **sửa canvas thoải mái mà demo không hỏng theo, và thử demo không mất dữ liệu**.

**Điều kiện chấp nhận**:
- Cho code demo, khi tìm import từ `src/tools/canvas/`, thì không có kết quả.
- Cho canvas thật đang có dữ liệu, khi thao tác trên demo, thì số board và object trong Cài đặt → Dữ liệu không đổi.
- Cho canvas thật đang mở ở tab khác, khi thao tác trên demo, thì tab kia không nhận gì.
- Cho demo đã bị sửa, khi tải lại trang, thì demo về đúng board mẫu ban đầu.
- Cho người xem không vào landing, khi mở `/canvas`, thì không tải code của demo.

### US-4: Thấy truy nguồn hoạt động
Là **người xem**, tôi muốn **bấm vào nguồn của một con số và thấy đúng chỗ nó được trích** để **tin vào điểm khác biệt chính của bibo**.

**Điều kiện chấp nhận**:
- Cho board mẫu, khi nhìn trích dẫn "Doanh thu Q3 +18%", thì thấy dòng nguồn "bao-cao-q3.pdf · trang 12 · bảng 3" và nút "Mở nguồn".
- Cho trích dẫn đó, khi bấm "Mở nguồn", thì mở panel xem trang tài liệu, đúng ô trong bảng được tô sáng.
- Cho panel xem nguồn đang mở, khi bấm đóng hoặc nhấn Esc, thì panel đóng, canvas vẫn bật.
- Cho trích dẫn, khi kéo, chọn, xoá, undo, thì xử lý như note.

### US-5: Màn hình hẹp không vỡ trang
Là **người xem trên điện thoại**, tôi muốn **thấy ảnh minh hoạ thay vì một canvas không dùng được** để **vẫn hiểu sản phẩm**.

**Điều kiện chấp nhận**:
- Cho màn hình hẹp hơn 900px, khi mở landing, thì thấy ảnh tĩnh của canvas mẫu kèm câu "Mở trên máy tính để thử".
- Cho màn hình rộng, khi thu hẹp cửa sổ qua mốc rồi mở rộng lại, thì đổi qua lại không lỗi.

### US-6: Phần ký họa bên dưới
Là **người xem đã thử xong**, tôi muốn **cuộn xuống đọc vấn đề, ba trụ, tính năng, cách dùng, lộ trình** để **hiểu vì sao bibo làm vậy**.

**Điều kiện chấp nhận**:
- Cho landing, khi cuộn xuống dưới demo, thì thấy các phần theo đúng nội dung và nét vẽ của `docs/landing-sketch.html`.
- Cho đổi ngôn ngữ vi / en, khi xem landing và demo, thì mọi chữ giao diện đổi theo. Nội dung board mẫu là dữ liệu, giữ một ngôn ngữ.
- Cho bật giảm chuyển động trong hệ điều hành, khi cuộn, thì không có hiệu ứng hiện dần hay nét vẽ chạy.

## Phân loại

**Phải có (must-have)**: US-1, US-2, US-3, US-4, US-5, US-6  
**Nên có (nice-to-have)**: nút "Làm lại board mẫu" trong demo.

## Ngoài phạm vi

- Mọi thay đổi trong `src/tools/canvas/`.
- Demo giống hệt canvas thật từng chi tiết (resize, chọn nhiều bằng khung, Unsort, board lồng nhau, menu chuột phải, định dạng chữ đậm / nghiêng).
- Provenance thật cho canvas.
- Thao tác chạm, đăng nhập, analytics.
