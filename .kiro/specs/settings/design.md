# Thiết kế — Cài đặt (phần không cần backend)

## Màn hình
1 modal (đã có): menu trái | nội dung phải. Các mục:
- Giao diện: Theme (Tối / Sáng / Theo hệ thống), Phong cách, Font "Sắp có", nút Đặt lại mặc định.
- Canvas: công tắc Lưới nền, chọn Tốc độ cuộn (Chậm / Vừa / Nhanh), nút Đặt lại mặc định.
- Phím tắt: bảng chỉ xem, nhóm Chỉnh sửa / Chọn / Xem / Unsort / Sắp lớp.
- Dữ liệu: Board, Object, Dung lượng (số thật), Sao lưu "Sắp có".

## Lưu trữ
- localStorage qua Zustand persist, mỗi nhóm 1 key:
  - `bibo-theme` (đã có, giá trị mới thêm `system`), `bibo-ui-style` (đã có), `bibo-canvas-settings` (mới).
- Mỗi nhóm là 1 object → sau này đồng bộ backend chỉ thay chỗ lưu.
- Tốc độ cuộn: Chậm 0.3, Vừa 0.5 (như cũ), Nhanh 0.8.

## Luồng
- Theo hệ thống: đọc `prefers-color-scheme`, nghe sự kiện đổi của máy, ghi `data-theme` thật (dark/light).
- Lưới: chỉ ẩn 2 lớp chấm, engine vẫn ghi style như cũ.
- Tốc độ cuộn: đọc lúc mỗi lần cuộn, không cần gắn lại listener.
- Dữ liệu: đọc IndexedDB của Canvas khi mở mục (tải module canvas lúc cần). Dung lượng dùng ước tính của trình duyệt.
- Danh sách phím: nguồn là các handler hiện có; khi thêm phím mới phải thêm dòng ở đây.

---

## Kích thước giao diện (mở rộng 2026-10-05)

### Milanote làm thế nào (đo 2026-10-05 trên tài khoản bạn, màn 1440px, zoom board 82% giữ nguyên)
- Đổi cỡ chữ gốc `<html>` 8 / 9 / 10px cho Nhỏ / Vừa / Lớn, gắn class `app-size-*` + `toolbar-size-*` lên body.
- Note 270 / 304 / 338px, chữ Note 11.2 / 12.6 / 14px, vị trí card (left) 360 / 405 / 450 → cả kích thước lẫn vị trí
  nhân cùng tỉ lệ 0.8 / 0.9 / 1.0 quanh gốc toạ độ. Mức zoom board không đổi.
- Toolbar 63 / 63 / 72px, Unsorted 303 / 341 / 379px. Header 44px cả 3 mức.
- "Recommended" đổi theo máy (màn 1440px hiện ở Large). bibo không tự đoán, dùng 1 mặc định cố định.
- bibo hiện tại khớp mức Lớn (Note 338px, chữ 14px).

### Đã chốt / Kiro tự chọn (bạn chưa trả lời 2 câu, Kiro lấy phương án nghiêng — sửa ở bước duyệt nếu khác ý)
- Tỉ lệ Nhỏ 0.8, Vừa 0.9, Lớn 1.0. Mặc định Lớn, nhãn "Khuyên dùng" ở Lớn. (câu 1 → A)
- To theo: canvas + toolbar trái + panel Unsort. Header, modal Cài đặt, menu tài khoản giữ nguyên. (câu 2 → A)
- Bỏ công tắc font tiêu đề (bạn chốt 2026-10-05).
- Dòng "Font chữ" trong Giao diện thay bằng khối "Kích thước giao diện". Chọn bộ font để sau.

### Màn hình
- Giao diện: Theme, Phong cách, **Kích thước giao diện** (3 thẻ chọn, phần xem trước là chữ "Aa" ở 3 cỡ dùng token
  theme, không dùng ảnh; thẻ chọn có tick; cạnh tiêu đề có gợi ý phím Ctrl Shift < hoặc >), nút Đặt lại mặc định.
- Phím tắt: thêm 2 dòng vào nhóm Xem: nhỏ đi / to lên.

### Lưu trữ
- Ô localStorage mới `bibo-interface`, 1 object `{ size }`, giá trị `small | medium | large`. Theo quy ước: 1 nhóm =
  1 store persist, không đổi tên ô.
- Đặt lại của mục Giao diện đặt lại cả theme, phong cách, kích thước.

### Luồng
- Canvas: camera lưu theo board giữ nguyên ý nghĩa ("zoom board", cái hiện trên header và lưu IDB). Engine camera dùng
  **zoom hiệu dụng = zoom board × tỉ lệ** khi ghi transform ra DOM và khi trả camera cho mọi chỗ đổi toạ độ (kéo, thả,
  hút cạnh, chọn vùng, edge-pan, preview kéo, card clipper, lưới nền). Nhờ vậy các chỗ đó không phải biết tỉ lệ.
  - Giới hạn zoom min/max, bước zoom, mốc 100% vẫn tính trên zoom board.
  - Fit nội dung: tính zoom vừa khung theo zoom hiệu dụng rồi chia tỉ lệ để ra zoom board.
  - Đổi kích thước: camera x/y giữ nguyên (giống Milanote, nội dung phóng quanh gốc toạ độ, có thể hơi trôi khỏi giữa
    màn hình). Engine vẽ lại ngay, không tween.
  - Rủi ro: chỗ nào đọc zoom board thay vì zoom hiệu dụng để đổi toạ độ sẽ lệch ở mức Nhỏ/Vừa. Task 7 rà hết chỗ đọc
    camera và kiểm từng thao tác ở mức Nhỏ.
- Toolbar + Unsort: phóng theo 1 biến CSS tỉ lệ đặt lên phần tử gốc (cùng chỗ đồng bộ `data-theme` ở App).
  - Chiều cao toolbar giữ cố định theo màn hình như hiện tại (chỉ bề rộng, nút, chữ nhỏ lại).
  - Unsort: các số cứng dùng tính vị trí kéo thả (chiều cao mỗi item, khoảng đầu danh sách) phải nhân tỉ lệ, nếu không
    kéo sắp xếp lệch hàng.
- Phím tắt: bắt ở hook phím của canvas, bỏ qua khi đang gõ chữ. Nhận cả theo phím vật lý (dấu phẩy / dấu chấm) vì
  `<` `>` phụ thuộc bố cục bàn phím. Chặn mặc định trình duyệt cho tổ hợp này.
- Chữ mới qua bộ dịch (vi trước, en cùng key), key dưới `SETTINGS.APPEARANCE.SIZE.*`. Bỏ key `SETTINGS.APPEARANCE.FONT.*`
  nếu không còn chỗ dùng.
