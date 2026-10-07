# Thiết kế — Modal phím tắt

**Trạng thái**: Nháp

## Màn hình

**Modal phím tắt** (toàn app, mount 1 lần như modal Cài đặt):
- Khung giữa màn hình, nền tối mờ phía sau, nút X góc phải trên. Theo token theme, phóng theo Kích thước giao diện.
- Cột trái (~200px): danh sách nhóm. Dưới cùng: "Bấm [/] để mở danh sách phím tắt".
- Cột phải: 1 vùng cuộn. Mỗi nhóm = tiêu đề + các dòng. Dòng = mô tả trái, cách bấm phải.
- Thứ tự nhóm: Thường dùng → Chỉnh sửa → Chọn → Xem → Sắp lớp → Unsort → Định dạng chữ → Markdown → Giao diện.
  - "Giao diện" nhận 3 phím toàn app (kích thước, sáng/tối) đang nằm ở nhóm Xem.

**Cài đặt**: bỏ mục Phím tắt khỏi menu. Câu mô tả bảng ("Trên Mac dùng Cmd...") bỏ.

**Trợ giúp → Phím tắt**: mở modal phím tắt (thay vì mở Cài đặt).

## Mô hình hiển thị

Mỗi thao tác trong bảng giờ hiển thị được 3 kiểu cách bấm:
1. **Phím** — như hiện tại (tổ hợp từ bảng phím).
2. **Phím + chuột** — phím bổ trợ + icon (lăn chuột, click, double-click, kéo).
3. **Gõ chuỗi** — "Gõ [#] rồi [Space]" cho Markdown.

Một dòng có nhiều cách bấm nối bằng "hoặc". Chữ nối ("giữ ... và kéo", "rồi") qua bộ dịch.

Thao tác do nơi khác xử lý (Tiptap, listener chuột) khai báo trong bảng dạng **chỉ hiển thị**: bộ điều phối bỏ qua, không cần hành động. Cùng cơ chế với Ctrl + lăn chuột hiện có.

Nhóm "Thường dùng" là danh sách id lấy từ các nhóm khác, không khai báo trùng.

## Ký hiệu theo hệ điều hành

- Nhận Mac qua `navigator.userAgentData.platform` hoặc `navigator.platform` chứa "Mac" (iPad cũng tính). Đọc 1 lần.
- Mac: `mod` → ⌘, Alt → ⌥, Shift → ⇧, Enter → ↩, Backspace → ⌫. Tooltip từng phím: "Command", "Option"...
- Mọi chỗ đang lấy chữ phím từ bảng (tooltip Undo/Redo, nút X, câu mẹo zoom, câu "Undo được (...)") tự theo, không phải sửa từng chỗ.
- Xử lý phím không đổi: bộ điều phối vẫn nhận Ctrl hoặc Cmd như nhau.

## Phím mở modal

- `/` ở lớp global, không chạy khi đang gõ chữ. Bàn phím có `/` ở vị trí khác vẫn nhận theo ký tự.
- Modal là lớp overlay chặn (như Cài đặt): Esc đóng, phím canvas không lọt.

## Dữ liệu

Không lưu gì. Trạng thái mở/đóng ở 1 store nhỏ (như `settings-modal-store`).

## Điều kiện biên

- Modal Cài đặt đang mở mà bấm `/`: không mở chồng (lớp Cài đặt chặn). Mở từ Trợ giúp thì Cài đặt không mở cùng lúc.
- Màn hẹp (< 640px): cột trái ẩn, chỉ còn danh sách cuộn.

## Rủi ro đã biết (không sửa trong spec này)

- Ctrl+Enter trong note: Tiptap có sẵn Ctrl+Enter = xuống dòng mềm, bibo dùng Ctrl+Enter = thoát sửa. Không ghi Ctrl+Enter vào nhóm Định dạng chữ; kiểm lúc Task 3 xem có chèn thừa dòng mềm trước khi thoát không.
- `NOTE_SCHEMA_EXTENSIONS` thêm Link 2 lần (StarterKit đã có Link) → console cảnh báo "Duplicate extension names: link". Báo riêng, không gộp vào đây.
