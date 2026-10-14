# Yêu cầu — Mã cho từng đoạn trong note (canvas-note-block-keys)

**Trạng thái**: Đã duyệt 2026-10-13 (bạn chọn làm ngay)
**Cập nhật cuối**: 2026-10-13

## Mục tiêu

Mỗi khối chữ trong note (đoạn, tiêu đề, list, trích dẫn...) có 1 mã riêng không đổi theo vị trí, giống `attrs.key` của Milanote (`milanote-sync-architecture.md` mục 1.3). Card Clipper tìm đoạn theo mã thay vì theo số thứ tự, để không cắt nhầm đoạn khi nội dung vừa đổi. Là nền cho gửi theo từng đoạn / ghép bản sửa của 2 người sau này (mục 2.6).

## User stories

### US-1: Mỗi khối có mã riêng
Là **bạn**, tôi muốn mỗi khối chữ có mã riêng để hệ thống nhận ra đúng khối dù nó đổi vị trí.

**Điều kiện chấp nhận**:
- Cho note mới, khi gõ nhiều đoạn, thì mỗi khối cấp ngoài cùng có 1 mã, không trùng nhau trong note.
- Cho bấm Enter giữa 1 đoạn, khi tách thành 2 đoạn, thì 2 đoạn có 2 mã khác nhau.
- Cho dán chữ (từ note khác hoặc ngoài app), khi dán xong, thì các khối dán vào có mã mới, không trùng mã có sẵn.
- Cho undo / redo, khi nội dung về bản cũ, thì mã của các khối về đúng như bản cũ.

### US-2: Note cũ tự có mã, không thêm bước undo
Là **bạn**, tôi muốn note đã có từ trước tự được cấp mã mà không phải làm gì.

**Điều kiện chấp nhận**:
- Cho note chưa có mã, khi mở sửa, thì mọi khối được cấp mã và lưu xuống.
- Cho mở sửa rồi thoát mà không gõ gì, khi bấm Undo, thì không có bước "Edit note" thừa.
- Cho note chưa có mã và chưa mở sửa lần nào, khi dùng Card Clipper, thì vẫn tách đúng đoạn theo vị trí như trước.

### US-3: Card Clipper tìm đoạn theo mã
Là **bạn**, tôi muốn kéo đoạn ra luôn lấy đúng đoạn tôi đã cầm.

**Điều kiện chấp nhận**:
- Cho đoạn có mã, khi kéo ra canvas, thì note mới chứa đúng đoạn đó, note gốc mất đúng đoạn đó (Alt = giữ lại).
- Cho đoạn đã cầm bị đổi vị trí hoặc bị xoá trong lúc kéo (tab khác, undo), khi thả, thì không cắt nhầm đoạn khác: đổi vị trí vẫn lấy đúng đoạn, bị xoá thì huỷ.
- Cho kéo đoạn ra (cắt), khi xong, thì note gốc giữ nguyên chế độ cao (`heightMode`) như trước khi cắt.

## Phân loại

**Phải có**: US-1, US-2, US-3.

## Ngoài phạm vi

- Gửi theo từng đoạn, ghép bản sửa của 2 người (chỉ chuẩn bị mã).
- Mã duy nhất giữa các note: chỉ cần duy nhất trong 1 note. Nhân bản / dán note giữ nguyên mã (khác note nên không trùng trong note).
- Yjs.
