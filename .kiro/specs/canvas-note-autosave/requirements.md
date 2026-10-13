# Yêu cầu — Note tự lưu + Ctrl+Enter tạo note mới

**Trạng thái**: Đã duyệt  
**Cập nhật cuối**: 2026-10-09

## Mục tiêu

Hiện note chỉ lưu lúc thoát sửa: đóng tab, F5 hoặc trình duyệt treo khi đang gõ là mất cả lần sửa. Tính năng này làm note tự lưu ngay khi gõ (gần như không mất chữ), chặn 2 tab cùng sửa 1 note, và đổi Ctrl+Enter thành "tạo note mới ngay bên dưới" như Milanote.

Đây là bước đầu của hướng đồng bộ đã chốt (phương án C, `.kiro/notes/canvas-backlog.md` mục 5): cơ chế ghi làm ở đây sẽ dùng lại cho việc gửi server sau này.

## Deprecates (hành vi thay thế)

- `.kiro/specs/canvas-content-objects/requirements.md` US Note: "blur / Escape / Ctrl+Enter thì thoát sửa và lưu" → Ctrl+Enter không còn là thoát sửa, thay bằng US-4 file này. Esc và click ra ngoài vẫn thoát.

## User stories

### US-1: Chữ không mất khi đang gõ
Là **người dùng**, tôi muốn **nội dung note được lưu ngay khi tôi gõ** để **không mất chữ khi lỡ đóng tab, F5 hoặc trình duyệt treo**.

**Điều kiện chấp nhận**:
- Cho đang sửa note, khi gõ chữ rồi F5 ngay (không bấm Esc), thì mở lại thấy chữ vừa gõ (chậm nhất mất phím cuối cùng trong vài chục ms).
- Cho đang sửa note, khi đóng tab rồi mở lại canvas, thì note giữ đúng nội dung lúc đóng.
- Cho đang gõ liên tục, khi gõ, thì không thấy khựng hay trễ chữ.
- Cho đang sửa note, khi chuyển sang tab khác của trình duyệt hoặc đổi board, thì phần chưa lưu được ghi ngay.
- Cho bộ nhớ trình duyệt đầy hoặc ghi lỗi, khi lưu thất bại, thì tiêu đề board hiện "Lưu lỗi", không im lặng bỏ qua.

### US-2: Undo gộp theo mỗi lần sửa
Là **người dùng**, tôi muốn **Ctrl+Z lùi lại cả 1 lần sửa note** để **không phải bấm undo hàng chục lần cho từng cụm chữ tự lưu**.

**Điều kiện chấp nhận**:
- Cho vừa sửa note (vào sửa → gõ → thoát), khi bấm Ctrl+Z 1 lần, thì note về đúng nội dung trước khi vào sửa.
- Cho trong lúc sửa note đã tự lưu nhiều lần, khi thoát sửa, thì lịch sử undo chỉ thêm đúng 1 bước.
- Cho vào sửa rồi thoát mà không đổi gì, khi thoát, thì không thêm bước undo nào.

### US-3: Không cho 2 tab cùng sửa 1 note
Là **người dùng mở canvas ở nhiều tab**, tôi muốn **mỗi note chỉ sửa được ở 1 tab tại một thời điểm** để **2 tab không ghi đè chữ của nhau**.

**Điều kiện chấp nhận**:
- Cho tab A đang sửa note X, khi tab B double-click note X, thì tab B không vào sửa được và thấy báo note đang được sửa ở tab khác.
- Cho tab A thoát sửa hoặc đóng tab, khi tab B double-click note X, thì tab B vào sửa được.
- Cho tab A vừa lưu note X, khi nhìn sang tab B, thì tab B thấy nội dung mới của note X (không cần F5).
- Cho tab A bị treo hoặc đóng đột ngột, khi tab B double-click note X, thì vào sửa được (khoá không bị treo mãi).
- Cho tab A đang sửa note X, khi người dùng chuyển sang tab B (tab A mất focus), thì tab A vẫn giữ chế độ sửa và khoá; chỉ click ra ngoài / Esc trong tab A mới thoát (bổ sung 2026-10-10 sau test).
- Cho đang kéo / resize object, khi F5 hoặc đóng tab trước lúc thả chuột, thì object giữ vị trí / kích thước cũ: chỉ thả mới tính là lưu (bổ sung 2026-10-10 sau test).
- Cho tab A đang sửa note X, khi tab B kéo, resize, đổi màu hoặc xoá note X, thì tab B không làm được (note X bị khoá cả thao tác, không riêng sửa chữ), để bản cũ của tab B không đè chữ mới của tab A.

### US-4: Ctrl+Enter tạo note mới ngay bên dưới
Là **người dùng đang ghi chú nhanh**, tôi muốn **bấm Ctrl+Enter để lưu note hiện tại và tạo note mới ngay bên dưới** để **gõ liền nhiều note mà không phải dùng chuột**.

**Điều kiện chấp nhận**:
- Cho đang sửa note, khi bấm Ctrl+Enter (Cmd+Enter trên Mac), thì note hiện tại được lưu, một note mới xuất hiện ngay bên dưới (cùng cột trái, cách một khoảng nhỏ) và con trỏ nằm trong note mới.
- Cho 1 note đang được chọn (chưa vào sửa), khi bấm Ctrl+Enter, thì cũng tạo note mới ngay bên dưới và vào sửa note mới (bổ sung 2026-10-10 sau test).
- Cho vừa tạo note mới bằng Ctrl+Enter, khi bấm Ctrl+Z, thì note mới biến mất (undo tạo note), note cũ giữ nguyên.
- Cho đang sửa note, khi bấm Enter, thì vẫn xuống dòng / thêm đoạn như hiện tại.
- Cho đang sửa note, khi bấm Esc hoặc click ra ngoài, thì vẫn thoát sửa và lưu.
- Cho mở danh sách phím tắt, khi xem nhóm liên quan note, thì Ctrl+Enter ghi đúng nghĩa mới.

## Phân loại

**Phải có (must-have)**: US-1, US-2, US-3, US-4  
**Nên có (nice-to-have)**: không có

## Ngoài phạm vi

- Gửi dữ liệu lên server, hàng đợi gửi server, WebSocket (spec `canvas-sync` khi chốt backend).
- Khoá note giữa nhiều người / nhiều máy, nhãn tên người đang sửa, nút "×" giành quyền.
- Bản xung đột khi sửa lúc mất mạng.
- Gõ chung 1 note (Yjs).
- Lưu theo từng thuộc tính thay vì cả object (để `canvas-sync`).
