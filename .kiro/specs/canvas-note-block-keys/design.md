# Thiết kế — Mã cho từng đoạn trong note (canvas-note-block-keys)

**Trạng thái**: Đã duyệt 2026-10-13

## Cách gắn mã

- Dùng extension `@tiptap/extension-unique-id` 3.31.3 (MIT, cùng bản Tiptap đang dùng, cài bản cố định). Thêm vào bộ extension chung của note (`lib/note-schema.ts`), nên editor lẫn bộ lọc HTML khi hiển thị đều giữ mã.
- Tên thuộc tính `key` → HTML ghi `data-key="..."` (giống `attrs.key` của Milanote).
- Loại khối có mã: đoạn, tiêu đề, list chấm, list số, mục list, trích dẫn, khối code, đường kẻ ngang. Không gắn cho phần chữ trong dòng (in đậm, link, xuống dòng mềm).
- Mã: 8 ký tự chữ + số ngẫu nhiên (ngắn như Milanote, không phải UUID 36 ký tự cho đỡ phình HTML). Chỉ cần không trùng trong 1 note.
- Extension tự lo: cấp mã khối mới, Enter tách đoạn, dán (bỏ mã cũ rồi cấp lại), kéo thả trong editor. Kiro đã đọc mã nguồn để kiểm.

## Note cũ chưa có mã

- Mở sửa → extension cấp mã cho mọi khối thiếu, đánh dấu không vào lịch sử undo → lần tự lưu đầu ghi body có mã xuống máy (và outbox ở dev).
- Chữ "trước khi sửa" (để làm bước undo) chụp SAU khi đã cấp mã → mở rồi thoát không gõ gì thì không có bước undo thừa.
- Chưa mở sửa lần nào → body chưa có mã → Card Clipper tìm theo vị trí như cũ.

## Card Clipper

- Lúc hover: đọc cả vị trí lẫn mã của khối (`data-key`).
- Lúc bấm và lúc thả: tìm khối theo mã trong body hiện tại. Có mã mà không tìm thấy (khối đã bị xoá) → huỷ, không lấy khối khác ở cùng vị trí. Không có mã → theo vị trí.
- Sửa kèm: cắt đoạn trước đây ghi lại note gốc chỉ với chữ + màu, làm mất `heightMode` (note cao cố định bị trả về tự cao). Giữ nguyên các trường khác.

## Test

- Tự động: hàm chọn khối theo mã / vị trí (thuần).
- Trình duyệt (MCP): note mới có mã; Enter tách ra 2 mã khác nhau; dán không trùng mã; note cũ mở sửa được cấp mã, thoát không gõ thì không có bước undo; Card Clipper lấy đúng đoạn sau khi đoạn đổi vị trí; khối bị xoá thì huỷ; cắt giữ `heightMode`.
