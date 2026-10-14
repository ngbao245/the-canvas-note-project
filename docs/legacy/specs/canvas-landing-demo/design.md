> LEGACY (chuyển 2026-10-13). Spec đã ship, chỉ còn là lịch sử thay đổi. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Task còn mở (nếu có) đã chép sang `.kiro/notes/backlog.md` / `canvas-backlog.md`.

# Thiết kế — Canvas demo trên landing

**Trạng thái**: Đã duyệt

## Nguyên tắc độc lập

- Demo là **một canvas mini riêng**, nằm trong thư mục landing. Không import, không sửa bất kỳ file nào trong `src/tools/canvas/`.
- Lý do không dùng lại canvas thật: `engine/actions.ts` và `NoteObject.tsx` gọi thẳng kho lưu IndexedDB. Import vào demo là demo ghi được vào dữ liệu thật. Muốn chặn thì phải sửa lõi canvas, trái yêu cầu.
- Được dùng chung (không thuộc canvas): `src/components/style/` (card vẽ tay), `src/components/shared/`, `src/components/ui/`, `src/lib/shortcuts`, `src/lib/i18n`, `src/lib/focus-ring`, store theme / ngôn ngữ toàn app.
- Cần một hàm toán thuần giống canvas (zoom quanh điểm, đổi toạ độ màn hình ↔ board) thì viết lại trong thư mục demo, không import. Đánh đổi: canvas thật đổi gì thì demo không tự theo, phải tự cập nhật khi muốn.
- Vì demo có state riêng, không còn cần iframe hay trang demo riêng. Demo là một component render thẳng trong landing.

## Màn hình / luồng

### Landing (`/`)

Thay trang `Landing` placeholder. Thứ tự từ trên xuống:

1. Thanh điều hướng nổi (giống bản HTML).
2. Phần đầu: tiêu đề + mô tả ngắn, bên dưới là **khung demo** rộng gần full nội dung, cao khoảng 560-640px.
3. Phần ký họa: Vấn đề → Ba trụ → Tính năng (3 cụm) → Cách dùng → Lộ trình → Kêu gọi cuối → Chân trang. Nội dung và nét vẽ chuyển từ `docs/legacy/landing-sketch.html`.
4. Cụm "Canvas mượt" bỏ hình phác, thay bằng câu chỉ lên khung demo ("Bạn vừa thử ở trên").

### Khung demo

- Header gọn 1 hàng trong khung: "bibo · bản thử", Undo / Redo, zoom %, "Làm lại" (nice-to-have), "Mở bản đầy đủ".
- Thanh công cụ dọc bên trái, chỉ 1 tile Note (kéo ra hoặc bấm để tạo).
- Mặt canvas chấm bi, note vẽ tay bằng card trong `src/components/style/`.
- Chọn note: viền màu nhấn đi cùng card (giữ rule cứng của canvas thật: card chọn luôn có viền, cả lúc đang kéo).
- Sửa chữ: bấm đúp → ô sửa chữ thường (không rich text). Esc hoặc bấm ra ngoài thì lưu và thoát sửa.
- Board mẫu mở lên đã căn cho thấy toàn bộ.

Ba trạng thái khung:

- **Nghỉ** (mặc định): lớp phủ trong suốt nhẹ + nhãn vẽ tay "Bấm để thử". Không bắt wheel, lăn chuột cuộn trang. Khung focus được bằng Tab, Enter / Space để bật.
- **Bật**: bỏ lớp phủ, gắn wheel listener (passive: false) để zoom / pan, bật lớp phím tắt của demo. Viền khung đổi màu nhấn.
- **Nhả**: về Nghỉ khi bấm ra ngoài khung, hoặc Esc lúc không còn gì để Esc đóng (thứ tự Esc: thoát sửa chữ → đóng panel nguồn → nhả khung).

Phím tắt đi qua bộ điều phối `@/lib/shortcuts` bằng một lớp riêng, chỉ bật khi khung ở trạng thái Bật. Không gắn `keydown` lên `window`.

### Board mẫu

- Note "Ý tưởng gom nguồn": vài dòng hướng dẫn (kéo thử, bấm đúp để sửa, kéo note mới từ thanh bên trái).
- Trích dẫn "Doanh thu Q3 +18%", nguồn "bao-cao-q3.pdf · trang 12 · bảng 3", nút "Mở nguồn".
- Note "Việc cần làm" 2-3 dòng.
- Một đường nối vẽ tĩnh giữa trích dẫn và note ý tưởng (không kéo được, chỉ theo vị trí 2 object). Nối tới object đã xoá thì ẩn đường.

### Panel xem nguồn

- Mở phủ bên phải khung demo: hình vẽ tay trang PDF, bảng 3 có ô tô vàng và khoanh đỏ, chú thích "trang 12 · bảng 3".
- Nút đóng, Esc đóng. Hình tĩnh, không có PDF thật.

### Màn hình hẹp

- Dưới 900px: không render canvas mini, hiện ảnh tĩnh SVG vẽ tay của board mẫu + câu "Mở trên máy tính để thử canvas".
- Code canvas mini tải lazy, chỉ tải khi màn hình đủ rộng.

## Dữ liệu

- State demo (object, chọn, camera, lịch sử undo, trạng thái khung) nằm trong 1 Zustand store riêng của landing. Không localStorage, không IndexedDB.
- Board mẫu là dữ liệu cố định trong code, nạp lại mỗi lần landing mount.
- Lịch sử undo giới hạn ~50 bước.
- Theme, ngôn ngữ đọc từ store toàn app. Demo luôn vẽ kiểu tay, không đọc / ghi lựa chọn phong cách của người dùng.

## Theme

Phần ký họa dùng màu cứng (giấy, mực, đỏ, xanh) để giữ chất sổ vẽ, không theo theme. Ngoại lệ này ghi vào `coding-style.md`, giới hạn trong thư mục landing. Khung demo bên trong theo token theme của app.

## Tương tác với tool khác

- Canvas: chỉ một link "Mở bản đầy đủ" sang `/canvas`. Không chia sẻ code, không chia sẻ dữ liệu.
- App: đổi component ở route `/` trong `App.tsx`.
- i18n: thêm key `LANDING.*` (gồm `LANDING.DEMO.*`). Nội dung board mẫu không dịch.

## Điều kiện biên

- Xoá hết object: hiện gợi ý mờ giữa khung ("Kéo note từ thanh bên trái"), giống canvas thật. "Làm lại" (nếu có) đưa về mẫu.
- Tải lazy canvas mini: skeleton đúng kích thước khung (header gọn + mặt chấm bi). Lỗi tải: `ErrorState` kèm thử lại, phần ký họa vẫn đọc được.
- Font Google không tải được: dùng font dự phòng.
- Thu cửa sổ qua mốc 900px khi đang sửa: bỏ canvas mini, thao tác dở mất (demo không lưu, chấp nhận).

## Quyết định đã hoãn

- Giữ `docs/legacy/landing-sketch.html` làm bản phác tham khảo (Kiro nghiêng giữ).
- Khi canvas thật ổn định và có provenance: cân nhắc thay canvas mini bằng canvas thật chạy chế độ demo (cần sửa lõi canvas, phải hỏi lại bạn).
