# Task — Mã cho từng đoạn trong note (canvas-note-block-keys)

**Trạng thái**: Xong code 2026-10-13. Kiro kiểm trên Chrome (MCP) pass, chờ bạn test tay.

- [x] Task 1: Gắn mã khối + Card Clipper tìm theo mã
  - Cài `@tiptap/extension-unique-id` 3.31.3 (cố định, MIT).
  - `lib/note-block-keys.ts` (cấu hình extension, mã 8 ký tự, chọn khối theo mã / vị trí) + test; `lib/note-schema.ts`; `lib/note-clip.ts` (`extractBlockHtml`, `removeBlock` thay cho theo số thứ tự); `hooks/useCardClipper.ts` (đọc `data-key`); `CardClipperButton.tsx`; `engine/actions.ts` (`clipParagraphToNewNote` nhận khối cần tách, giữ `heightMode`); `NoteObject.tsx` (chụp chữ "trước" sau lần cấp mã).
  - Verify: 48 test, build, lint pass. Chrome (MCP, dev cổng 3011):
    - K0 note cũ chưa mở sửa: chưa có mã (Card Clipper theo vị trí).
    - K1 mở sửa note cũ: 3 khối được cấp mã; thoát không gõ: 0 bước undo thêm.
    - K2 Enter giữa đoạn: 4 mã, không trùng.
    - K3 dán 2 đoạn mang mã trùng: mã được cấp lại, không trùng; undo: mã về đúng bản cũ.
    - K4 khối cuối đổi vị trí (xoá khối đầu) rồi tách theo mã: lấy đúng đoạn "Ba".
    - K5 mã đã bị xoá: huỷ, không tách khối khác.
    - K6 cắt đoạn: note gốc giữ `heightMode: fixed`.
    - Note mới gõ 2 dòng: view mode giữ `data-key` sau bộ lọc HTML; đúng 1 bước undo.

## Test tay cho bạn

- N1: tạo note, gõ 3 dòng, thoát. Hover từng dòng → kéo dòng giữa ra canvas → note mới đúng dòng đó, note gốc mất đúng dòng đó. Ctrl+Z → về như cũ.
- N2: Alt + kéo → note gốc giữ dòng.
- N3: note cũ từ trước hôm nay: mở sửa rồi Esc ngay → Ctrl+Z không làm gì với note đó.
- N4: note đã kéo góc cho cao cố định → tách 1 dòng → note gốc vẫn giữ chiều cao, không tự co giãn.

## Định nghĩa "xong"

```
[x] npm run build pass
[x] npm run lint pass (1 warning shadcn đã biết)
[x] npm run test pass (48)
[x] Không có console.log mới
[x] tasks.md task này đã [x]
[x] Nếu đổi behavior: doc/spec liên quan đã update
```
