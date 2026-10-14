> LEGACY (chuyển 2026-10-13). Trạng thái hiện tại: `docs/system/01-core.md`. Spec này chỉ còn là lịch sử thay đổi.

# Thiết kế — Bảng công cụ dev (dev-panel)

**Trạng thái**: Nháp

## Màn hình / luồng

1 bảng nổi góc phải dưới, nằm trên mọi tầng (tầng z dành cho dev đã có). 2 trạng thái:

- **Thu gọn**: 1 thanh nhỏ gồm WIN/MAC, VI/EN, chấm báo đang đo (nếu đang đo phiên), nút mở rộng.
- **Mở rộng**: thanh trên + các mục xếp dọc, mỗi mục có tiêu đề nhỏ.

Mục hiện có:

1. **Chung**: WIN / MAC, VI / EN (chuyển từ nút dev cũ, xoá file cũ).
2. **Hàng đợi ghi**:
   - Công tắc Phiên / Liên tục (mặc định Phiên).
   - Phiên: ô chọn nhãn kịch bản, nút Bắt đầu / Dừng, danh sách kết quả các phiên (mới nhất trên), nút Copy, nút Xoá hết.
   - Liên tục: 1 kết quả cập nhật trực tiếp, nút Copy, nút Xoá về 0.
   - Mỗi kết quả: các số ở US-3 + dòng "gom 0 / 300ms / 1s / 2s → số lần ghi".

Danh sách mục là 1 mảng khai báo. Thêm thứ cần test sau này = thêm 1 phần tử, không sửa khung bảng.

Chữ trong bảng không qua bộ dịch (công cụ dev, giống nút cũ). Dùng token theme, focus ring chung, phím Esc không gắn (bảng không phải modal).

## Dữ liệu

- **Nguồn sự kiện**: hàng đợi ghi nhận thêm 1 tham số tuỳ chọn để báo 3 loại sự kiện: đưa vào (giờ, id, kênh), lô bắt đầu / xong (giờ, số object, thành / lỗi). Hàng đợi vẫn thuần, không biết bảng dev tồn tại. Chỉ chỗ dựng repository truyền tham số này, và chỉ khi chạy dev → bản build không có.
- **Long task**: theo dõi qua API long task của trình duyệt (chỉ Chrome / Edge có). Trình duyệt khác hiện "không hỗ trợ" thay vì số 0.
- **Lưu**: sự kiện giữ trong bộ nhớ, mất khi F5 (đo xong copy là đủ). Chỉ trạng thái thu gọn / mở rộng và chế độ Phiên / Liên tục lưu localStorage.
- **Giới hạn bộ nhớ**: chế độ Liên tục giữ tối đa ~20.000 sự kiện đưa vào gần nhất cho phần mô phỏng; số đếm tổng vẫn đúng.

### Cách tính

- Tỉ lệ gom = 1 − (số object đã ghi qua các lô ÷ số lần đưa vào). Kéo lẻ → gần 0%, gõ nhanh → cao.
- Mô phỏng cửa sổ W: duyệt các lần đưa vào theo giờ. Lần đầu mở 1 cửa sổ; mọi lần đưa vào trong W ms sau đó gộp chung (mọi id chung 1 lô, giống hàng đợi thật ghi cả lô 1 transaction). Hết cửa sổ → tính 1 lần ghi, lần đưa vào kế mở cửa sổ mới. W = 0 dùng số lô thật đã đo.
- Đây là "gom có trần" (ghi muộn nhất W ms sau thay đổi đầu), không phải debounce chờ ngừng gõ.

## Tương tác với tool khác

- Đọc / ghi store ngôn ngữ và store kiểu bàn phím (như nút cũ).
- Đọc số object board đang mở từ store canvas khi Copy (không có canvas thì ghi "không ở canvas").
- Không đụng IndexedDB, không đổi hành vi ghi.

## Điều kiện biên

- Chưa có kết quả: mục hiện 1 dòng hướng dẫn ngắn, nút Copy bị khoá.
- Bấm Dừng khi phiên không có sự kiện: vẫn thêm dòng với số 0 (để thấy "không ghi gì" cũng là kết quả).
- Clipboard bị chặn: nút báo "copy failed" tại chỗ.
- Phiên đang chạy mà đổi chế độ: dừng phiên trước, giữ kết quả.

## Sửa kèm

- Comment trong `api.ts` ghi "Kéo object ghi mỗi pointermove" đã sai (code chỉ ghi lúc thả). Sửa comment.

## Quyết định đã hoãn

- Có gom ghi thật hay không: chờ số đo từ bảng này.
- Đo phía gửi Supabase: làm ở `canvas-sync`, có thể thêm mục vào bảng lúc đó.
