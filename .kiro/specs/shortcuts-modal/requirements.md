# Yêu cầu — Modal phím tắt

**Trạng thái**: Đã duyệt  
**Cập nhật cuối**: 2026-10-07

Mở rộng spec `shortcuts` (bảng phím chung + bộ điều phối). Spec đó vẫn là nguồn chuẩn cho cách xử lý phím; spec này chỉ đổi chỗ hiển thị và thêm nội dung.

## Deprecates

- `.kiro/specs/shortcuts/` US-1 điều kiện "hiện trong Cài đặt → Phím tắt" → thay bằng modal phím tắt (US-1 file này).

## Mục tiêu

Danh sách phím tắt là trợ giúp, không phải cài đặt. Đưa nó ra một modal riêng kiểu Milanote, ghi đủ cả thao tác chuột lẫn phím định dạng chữ đang chạy được, và hiện đúng ký hiệu phím trên Mac.

## User stories

### US-1: Modal phím tắt riêng
Là **người dùng**, tôi muốn **mở danh sách phím tắt từ Trợ giúp hoặc bằng 1 phím** để **tra nhanh mà không phải vào Cài đặt**.

- Cho đang ở canvas, khi bấm Trợ giúp → Phím tắt, thì mở modal phím tắt.
- Cho không gõ chữ, khi bấm `/`, thì mở modal phím tắt. Đang gõ chữ thì `/` là ký tự bình thường.
- Cho modal đang mở, khi bấm Esc / nút X / bấm nền, thì modal đóng và focus về chỗ cũ.
- Cho modal đang mở, khi bấm phím canvas (Delete, F, Ctrl+Z...), thì canvas không phản ứng.
- Cho mở Cài đặt, thì không còn mục Phím tắt trong menu.

### US-2: Bố cục 2 cột
Là **người dùng**, tôi muốn **thấy menu nhóm bên trái, danh sách liền bên phải** để **lướt hết hoặc nhảy thẳng tới nhóm cần**.

- Cho modal mở, thì cột trái liệt kê các nhóm, cột phải là 1 danh sách cuộn gồm mọi nhóm nối tiếp, mỗi nhóm có tiêu đề.
- Cho bấm 1 nhóm ở cột trái, thì cột phải cuộn tới nhóm đó.
- Cho cuộn cột phải, thì nhóm đang xem được tô ở cột trái.
- Cột trái có gợi ý "Bấm [/] để mở danh sách phím tắt".

### US-3: Nhóm "Thường dùng"
Là **người mới**, tôi muốn **1 nhóm đầu gom các thao tác quan trọng nhất** để **không phải đọc hết danh sách**.

- Nhóm đầu tiên là "Thường dùng". Một thao tác có thể vừa nằm trong "Thường dùng" vừa nằm ở nhóm gốc.

### US-4: Ghi đủ thao tác chuột
Là **người dùng**, tôi muốn **thấy cả thao tác chuột đang có** để **biết hết cách dùng**.

Mỗi dòng ghi được: phím, chữ nối ("hoặc", "giữ ... và kéo"), icon chuột / con trỏ. Bổ sung các dòng bảng cũ thiếu:
- Sửa object: double-click (bên cạnh Enter).
- Kéo màn hình: Ctrl + kéo, hoặc giữ Space và kéo, hoặc kéo nút chuột giữa (gộp 1 dòng).
- Chọn thêm / bỏ chọn: Shift + click hoặc Ctrl + click.
- Chọn vùng: kéo trên vùng trống; Shift + kéo để chọn thêm.
- Tách đoạn khỏi note: kéo icon thẻ bên phải đoạn; giữ Alt khi kéo để sao chép thay vì cắt.
- Thu phóng: Ctrl + lăn chuột (đã có).

Chỉ ghi thao tác Kiro đã đọc trong code thấy đang chạy. Có thao tác nào không chạy thì bỏ, không ghi.

### US-5: Phím định dạng chữ
Là **người dùng**, tôi muốn **biết phím định dạng khi sửa note** để **viết nhanh**.

- Nhóm "Định dạng chữ" (khi đang sửa note): đậm, nghiêng, gạch chân, gạch ngang, code, tiêu đề 1-3, danh sách chấm, danh sách số, trích dẫn, khối code.
- Nhóm "Markdown" (gõ ở đầu dòng): `#` / `##` / `###` + Space, `-` hoặc `*` + Space, `1.` + Space, `>` + Space, ` ``` ` , `---`, `**chữ**`, `*chữ*`.
- Mỗi phím ghi vào bảng phải là phím editor đang chạy thật (kiểm trên trình duyệt trước khi chốt danh sách).

### US-6: Ký hiệu phím theo hệ điều hành
Là **người dùng Mac**, tôi muốn **thấy ⌘ ⌥ ⇧ thay cho Ctrl Alt Shift** để **bấm đúng phím trên máy mình**.

- Cho máy Mac, thì modal, tooltip (Undo/Redo, nút X) và câu mẹo (Ctrl + lăn chuột) hiện ⌘ / ⌥ / ⇧. Rê chuột vào phím hiện tên đầy đủ ("Command", "Option").
- Cho máy khác, thì hiện Ctrl / Alt / Shift như hiện tại.
- Bỏ câu "Trên Mac dùng Cmd thay cho Ctrl" vì không cần nữa.

## Phân loại

**Phải có**: US-1, US-2, US-4, US-6  
**Nên có**: US-3, US-5

## Ngoài phạm vi

- Phím mới mà bibo chưa có (Search Ctrl+F, presentation, nudge mũi tên, đi về board cha...). Ghi vào backlog nếu bạn muốn.
- Tìm kiếm trong modal.
- Người dùng tự đổi phím.
