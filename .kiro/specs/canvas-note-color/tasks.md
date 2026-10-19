# Task — Popup Màu của Note

**Trạng thái**: Đã làm 2026-10-15, chờ test tay CC1–CC8

Tham chiếu: `requirements.md`, `design.md`, `docs/system/12-note.md`. Build + lint 1 lần cuối mỗi phase; trong phase dùng getDiagnostics.

## Phase 1: Dữ liệu + hiển thị

- [x] Task 1: Thêm `background`, `textColor` vào NoteData (US-8)
  - Nội dung: schema + `parseNoteData` điền mặc định `null`; tách đoạn / dán / Card Clipper copy đủ 3 trường.
  - Verify: getDiagnostics clean; note cũ mở lên không đổi gì.

- [x] Task 2: Bảng màu mới (US-2, US-3, US-4)
  - Nội dung: thay bảng 6 màu bằng 13 màu chuẩn, 6/7 cặp "A" và 7 màu gợi ý theo theme (số liệu `design.md`), tên màu key dịch vi + en. Hàm tính nền sáng / tối cho US-6.
  - Verify: getDiagnostics clean.

- [x] Task 3: Note vẽ nền + màu chữ (US-1, US-6)
  - Nội dung: renderer note áp `background` (kể cả trong suốt), màu chữ theo thứ tự `textColor` → tự tương phản → theme, chung cho xem + sửa. Thanh trên đầu giữ theo `color`.
  - Verify (build cuối phase): sửa tay data 1 note (dev) → nền + chữ đúng ở cả xem lẫn sửa, F5 giữ.

## Phase 2: Popup

- [x] Task 4: Popup Màu 2 tab + các hàng màu (US-1 đến US-4)
  - Nội dung: thanh tab Background / Top strip; hàng chuẩn (13 / 12 ô), hàng "A" (chỉ Background), hàng gợi ý; ô đang áp có viền chọn; chọn không đóng popup; mỗi lần chọn 1 bước undo.
  - Verify: chọn từng loại → note đổi đúng; nền + thanh cùng hiện; Ctrl+Z 1 bước.

- [x] Task 5: Custom color (US-5)
  - Nội dung: nút "Custom color…" mở ô chọn màu trình duyệt, áp cho tab đang mở, chỉ ghi undo khi `change`; huỷ thì không đổi.
  - Verify (build cuối phase): chọn màu tự do ở 2 tab → đúng; chữ tự tương phản.

## Phase 3: Toolbar + chốt doc

- [x] Task 6: Icon nút Màu xem trước màu note (US-7)
  - Verify: đổi màu → icon đổi theo; note không màu → icon mặc định.

- [x] Task 7: Cập nhật doc + handoff
  - Nội dung: `docs/system/12-note.md` (bảng dữ liệu, mục Màu, file `note-colors`), `decisions.md`, handoff thêm case test tay.
  - Verify (build + lint cuối phase): doc khớp code.

## Định nghĩa "xong"

```
[ ] npm run build pass (cuối phase)
[ ] npm run lint pass (cuối phase)
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] Nếu đổi behavior: doc/spec liên quan đã update
```
