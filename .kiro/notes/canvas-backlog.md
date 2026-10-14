# Canvas — Backlog (tính năng chưa làm)

Gọn lại 2026-10-13. Bản cũ đầy đủ (gồm mục đã làm + plan cũ): `docs/legacy/canvas-backlog-2026-10-13.md`.

Luật: chỉ ghi tính năng CHƯA làm. Làm xong → xoá mục (hành vi mới ghi vào `docs/system/`). Việc đang dở / chờ test ở `canvas-session-handoff.md`, không ở đây.

## Object type mới

- **Image + Link**: spec `.kiro/specs/canvas-content-objects/` Task 5-9.
- **Line (từ chấm QuickLine)**: hiện chỉ có chấm ở góc note, chưa kéo được. Cần spec riêng `canvas-line-object`. Ý chính đã bàn 2026-09-18:
  - Object type mới, 2 đầu; mỗi đầu là 1 điểm tự do hoặc gắn vào cạnh 1 object (`left/right/top/bottom/center`).
  - Kéo từ chấm QuickLine → line tạm theo con trỏ; thả lên object = gắn, thả chỗ trống = điểm tự do.
  - Dáng: thẳng / cong / gấp khúc (Milanote mặc định cong). Vẽ bằng lớp SVG trong world.
  - Object gắn bị di chuyển / đổi cỡ → đầu line đi theo. Object bị xoá → đầu đó thành điểm tự do tại chỗ cũ.
  - Làm sau Image + Link. Ước 1-2 ngày.

## Nhân bản board (bạn chốt 2026-10-13)

- Ctrl+D / dán board tile → tạo board MỚI và chép cả nội dung (cây con, object), giống Milanote. Hiện ra 2 tile trỏ cùng 1 board (sai: xoá / đếm rối).
- Cần spec riêng: chép sâu bao nhiêu cấp, đổi id mọi object + `linkedBoardId`, tên board mới ("... copy"?), 1 bước undo, dán sang board khác, clipboard chỉ mang tile (chưa mang nội dung).

## Thùng rác (bạn chốt 2026-10-13)

- Xoá vào thùng rác không hỏi lại. Bấm nút thùng rác → popup "đã xoá gần đây", lấy lại được (giống Milanote). Hiện nút chỉ xoá thẳng, chưa có popup, chưa lưu object đã xoá.
- Cần quyết khi làm: lưu object đã xoá ở đâu (store riêng / cờ `deletedAt`), giữ bao lâu, xoá board tile thì board con + nội dung đi theo thế nào, phím Delete có đi vào thùng rác luôn (bỏ dialog) không.

## Chọn nhiều trong Unsort

- Spec `.kiro/specs/canvas-unsort-multi-select/` Task 5-7: preview chồng nhiều item, đổi thứ tự khi chọn nhiều.

## Chia sẻ board + nhiều người cùng sửa (`canvas-sharing`, sau `canvas-sync`)

Hướng lưu / gửi / khoá / xung đột: nguồn chuẩn `milanote-sync-architecture.md` mục 2.4a–2.8. Phần chỉ có ở đây (bạn chốt 2026-10-08):

- Người được mời chỉ vào đúng board được mời. Lúc mời chọn: chỉ board đó, hoặc board đó + board con.
- KHÔNG cho mời ở board gốc Home (không gian riêng của chủ tài khoản).
- Sửa lúc mất mạng rồi xung đột: không đè; bản thua thành note "bản xung đột" đặt cạnh note gốc (kiểu Dropbox).
- Chừa đường lên Yjs (chỉ khi cần 2 người gõ chung 1 note): kênh chữ đã tách khỏi kênh thuộc tính trong hàng đợi. Lên Yjs thì chỉ thay kênh chữ (Yjs + Tiptap Collaboration + y-indexeddb), cần bước đổi note HTML cũ sang Yjs, sửa bảng Stack `docs/system/01-core.md`, bỏ khoá note.

## Polish

- **Badge "đang sửa ở tab khác"** (`components/RemoteEditBadge.tsx`, bạn chốt tạm OK 2026-10-10): màu đang `warning`; khi có tài khoản đổi màu theo người, avatar + tên thật (`canvas-sharing`). Nhãn có thể đè chấm QuickLine cùng góc.
- **Thu nhỏ số z-index**: token `--z-toolbar` … `--z-tooltip` đang 20000-60000. Phần kéo đã portal ra `document.body` (2026-09-21), nên có thể đổi 6 token trong `src/styles/index.css` xuống 1-9 (giữ tên biến). Làm cùng phần `02` hoặc khi có lỗi chồng lớp. Xem `docs/system/02-ui-common.md` mục "Lớp z".

## Đã cân nhắc, không làm

- **Hút lưới (snap-to-grid)**: Milanote không có, bạn nghiêng không làm (đã có hút cạnh cùng loại). Nếu đổi ý: bật / tắt trong toolbar, lưu localStorage, cỡ lưới phải khớp chấm nền.
- **Unsort chung cho mọi board**: không làm, Unsort theo từng board là đúng (bạn kiểm 2026-10-12).
