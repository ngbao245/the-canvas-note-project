> LEGACY (chuyển 2026-10-13). Trạng thái hiện tại: `docs/system/01-core.md`. Spec này chỉ còn là lịch sử thay đổi.

# Yêu cầu — Bảng công cụ dev (dev-panel)

**Trạng thái**: Nháp  
**Cập nhật cuối**: 2026-10-13

## Mục tiêu

Gom mọi thứ cần test tay lúc dev vào 1 bảng nổi: đổi Win/Mac, đổi ngôn ngữ, và đo hàng đợi ghi object để quyết định có cần gom ghi theo thời gian không (bàn ở session 2026-10-13). Sau này có gì cần test thì thêm mục vào bảng này.

Chỉ có ở bản dev. Bản build không chứa bảng, cũng không chứa bộ đếm.

## User stories

### US-1: Bảng luôn hiện ở dev
Là **bạn (dev)**, tôi muốn bảng công cụ luôn có trên màn hình khi chạy dev để không phải nhớ cách mở.

**Điều kiện chấp nhận**:
- Cho `npm run dev`, khi mở bất kỳ trang nào của app, thì thấy bảng ở góc phải dưới.
- Cho bảng đang mở rộng, khi bấm thu gọn, thì bảng còn 1 thanh nhỏ (vẫn thấy Win/Mac, VI/EN, trạng thái đang đo), không biến mất hẳn. F5 vẫn giữ trạng thái thu gọn / mở rộng.
- Cho `npm run build`, khi tìm trong `dist/`, thì không có code của bảng và bộ đếm.

### US-2: Đổi Win/Mac và ngôn ngữ
Là **bạn**, tôi muốn đổi kiểu bàn phím và ngôn ngữ ngay trong bảng để kiểm chữ và nhãn phím.

**Điều kiện chấp nhận**:
- Cho bảng hiện, khi bấm WIN / MAC hoặc VI / EN, thì app đổi ngay và Cài đặt thấy cùng giá trị (giống nút dev cũ).
- Nút dev cũ (2 nhóm nút nổi) không còn, chỉ còn bảng mới.

### US-3: Đo hàng đợi ghi, 2 chế độ
Là **bạn**, tôi muốn đo số lần ghi object khi kéo và gõ để biết hàng đợi có gom được không.

**Điều kiện chấp nhận**:
- Có công tắc chế độ: **Phiên** (mặc định) và **Liên tục**.
- Chế độ Phiên: chọn nhãn kịch bản (A kéo lẻ, B kéo nhiều item, C gõ thường, D gõ nhanh, E gõ trên board lớn, Khác), bấm Bắt đầu, thao tác, bấm Dừng → thêm 1 dòng kết quả. Các phiên giữ lại để so, có nút Xoá hết.
- Chế độ Liên tục: đếm từ lúc mở app, số cập nhật trực tiếp, có nút Xoá về 0.
- Mỗi kết quả có: số lần đưa vào hàng đợi (tách chữ / thuộc tính), số lô ghi, số object trung bình và lớn nhất mỗi lô, tỉ lệ gom được, thời gian ghi (trung bình, lớn nhất), số lần ghi lỗi, số long task trên 50ms, thời lượng đo.
- Cho đang đo, khi kéo 1 item rồi thả, thì số đưa vào tăng đúng 1 và số lô tăng 1.

### US-4: Bảng "nếu gom theo cửa sổ"
Là **bạn**, tôi muốn thấy nếu gom ghi theo 300ms / 1s / 2s thì còn bao nhiêu lần ghi, để quyết có nên gom không mà chưa cần code gom thật.

**Điều kiện chấp nhận**:
- Mỗi kết quả kèm số lần ghi ước tính với cửa sổ 0 (hiện tại), 300ms, 1s, 2s, tính lại từ chính các lần đưa vào đã đo.

### US-5: Copy kết quả
Là **bạn**, tôi muốn chép kết quả ra dạng chữ để dán vào chat cho Kiro.

**Điều kiện chấp nhận**:
- Cho có ít nhất 1 kết quả, khi bấm Copy, thì clipboard có bảng chữ thuần (đọc được trong chat, không cần định dạng), kèm Win/Mac, ngôn ngữ, số object trên board đang mở.

## Phân loại

**Phải có**: US-1, US-2, US-3, US-4, US-5.  
**Nên có**: chưa có.

## Ngoài phạm vi

- Gom ghi theo thời gian thật (chỉ mô phỏng con số).
- Đo ghi board / camera (không đi qua hàng đợi; camera ghi liên tục là cố ý).
- Sửa `flush()` trả kết quả thành / bại (vấn đề 1 của phân tích, làm riêng).
- Dịch chữ trong bảng: công cụ dev, giữ tiếng Anh ngắn như nút dev cũ.
