# Yêu cầu — Hoàn thiện Note

**Trạng thái**: Nháp
**Cập nhật cuối**: 2026-10-14

## Mục tiêu

Nối các nút giữ chỗ trên toolbar note và mở rộng định dạng chữ cho khớp Milanote, đồng thời dọn 2 khoản nợ cũ (undo kéo góc, min size note fixed). Mục tiêu: note của bibo đủ chức năng định dạng + sắp xếp như note Milanote, trừ các tính năng cần đăng nhập (Reactions, Comment, Labels) thì tạm vô hiệu nút.

Đo Milanote thật 2026-10-14 (ghi ở `.kiro/notes/canvas-session-handoff.md` mục "Đo Milanote"). Spec bám theo đó.

## User stories

### US-1: Gộp undo kéo góc note (nợ cũ)
Là **người dùng**, tôi muốn **kéo góc note tự-cao rồi Ctrl+Z một lần là về đúng trạng thái trước khi kéo** để **không phải nhấn undo hai lần khó hiểu**.

**Điều kiện chấp nhận**:
- Cho note `heightMode: auto`, khi kéo góc đổi kích thước (lần đầu chuyển sang `fixed`), thì chỉ tạo đúng 1 bước undo gộp cả resize lẫn đổi `heightMode`.
- Cho note vừa kéo góc, khi Ctrl+Z một lần, thì note về đúng kích thước và `heightMode` trước khi kéo.
- Cho note đã `fixed` sẵn, khi kéo góc, thì vẫn chỉ 1 bước undo (resize) như hiện tại.

### US-2: Chốt kích thước tối thiểu note fixed (nợ cũ)
Là **người dùng**, tôi muốn **note ở chế độ cố định không kéo nhỏ hơn 68px chiều cao** để **note không bị bóp dẹt khác với note tự-cao**.

**Điều kiện chấp nhận**:
- Cho note `heightMode: fixed`, khi kéo góc thu nhỏ, thì chiều cao dừng ở tối thiểu 68 (bằng với note tự-cao), không nhỏ hơn.
- Cho note `heightMode: auto`, hành vi tối thiểu 68 giữ nguyên như hiện tại.

### US-3: Dịch chữ cứng toolbar note (nợ cũ)
Là **người dùng đổi ngôn ngữ**, tôi muốn **mọi nhãn trên toolbar note hiện đúng ngôn ngữ** để **giao diện nhất quán**.

**Điều kiện chấp nhận**:
- Cho toolbar note (chọn + sửa), khi xem ở tiếng Việt / tiếng Anh, thì mọi nhãn nút, tên kiểu chữ, nút Save/Remove/Cancel của Link, placeholder editor, `title`/`aria-label` đều qua bộ dịch.
- Cho popup có `anchorLabel` (Text style, Link), khi dịch nhãn nút mở, thì `anchorLabel` dùng cùng key (giữ `INV-NOTE-11`).

### US-4: Mở rộng kiểu khối trong Text style
Là **người dùng**, tôi muốn **chọn thêm Small text, Code block, Callout trong popup Text style** để **định dạng note giống Milanote**.

**Điều kiện chấp nhận**:
- Cho editor note, khi mở popup Text style, thì ngoài Title/Heading/Subheading/Body/Quote hiện có, có thêm Small text, Code block, Callout.
- Cho con trỏ trong một khối, khi chọn một kiểu, thì khối đổi sang kiểu đó; kiểu đang áp hiện dấu chọn (active) trong popup.
- Cho body note đã lưu Small text / Code block / Callout, khi xem lại note (không sửa), thì khối hiển thị đúng kiểu (qua `sanitizeNoteHtml`, không bị bộ lọc xoá).

### US-5: Màu chữ
Là **người dùng**, tôi muốn **đổi màu chữ cho đoạn đang chọn** để **nhấn mạnh nội dung**.

**Điều kiện chấp nhận**:
- Cho popup Text style, khi xem, thì có nhóm Color gồm mặc định + 5 màu (xanh dương, xanh lá, cam, đỏ, xám).
- Cho đoạn chữ đang chọn, khi bấm một màu, thì chữ đổi màu đó; bấm màu mặc định thì bỏ màu.
- Cho body đã lưu màu chữ, khi xem lại / F5, thì màu giữ nguyên.

### US-6: Tô nền chữ (highlight)
Là **người dùng**, tôi muốn **tô nền cho đoạn đang chọn** để **đánh dấu như bút dạ quang**.

**Điều kiện chấp nhận**:
- Cho popup Text style, khi xem, thì có nhóm Highlight gồm không-nền + 5 màu nền (xanh dương nhạt, xanh lá nhạt, vàng, hồng, xám).
- Cho đoạn chữ đang chọn, khi bấm một màu nền, thì đoạn được tô nền; bấm không-nền thì bỏ nền.
- Cho body đã lưu highlight, khi xem lại / F5, thì nền giữ nguyên.

### US-9: Định dạng chữ bổ sung — gạch chân, gạch ngang, code inline, căn lề
Là **người dùng**, tôi muốn **gạch chân, gạch ngang, code trong dòng và căn lề đoạn** để **định dạng note đầy đủ như Milanote**.

**Điều kiện chấp nhận**:
- Cho editor note đang sửa, khi mở menu More, thì có: Underline (gạch chân), Strikethrough (gạch ngang), Code inline (`</>`), Align (căn trái/giữa/phải).
- Cho đoạn chữ đang chọn, khi bấm một định dạng, thì áp đúng; định dạng đang áp hiện active trong menu.
- Cho body đã lưu các định dạng này, khi xem lại / F5, thì giữ nguyên (qua `sanitizeNoteHtml`, không bị bộ lọc xoá).
- Cho căn lề, khi chọn trái/giữa/phải, thì đoạn hiện con trỏ đổi căn lề tương ứng.

### US-7: Menu More (chế độ chọn) — sắp xếp lớp + khoá vị trí
Là **người dùng**, tôi muốn **mở menu More của note để đưa lên trước, ra sau, khoá vị trí** để **sắp xếp note trên canvas giống Milanote**.

**Điều kiện chấp nhận**:
- Cho note đang chọn, khi bấm More, thì mở menu gồm: Convert to Document (vô hiệu, mờ), Lock Position, Bring to Front, Send to Back.
- Cho note, khi bấm Bring to Front, thì note lên trên tất cả object cùng board (dùng `bringToFront` sẵn có); Send to Back thì xuống dưới cùng.
- Cho note, khi bấm Lock Position, thì note bị khoá: không kéo di chuyển được, không kéo góc đổi kích thước được; menu đổi mục thành Unlock Position để mở khoá.
- Cho note đã khoá, khi F5, thì vẫn khoá (trạng thái lưu trong data).
- Cho Convert to Document, khi rê vào, thì nút mờ, không bấm được (chưa có object type Document).

### US-8: Vô hiệu các nút chưa làm được
Là **người dùng**, tôi muốn **các nút chưa làm được hiện rõ là chưa dùng được** để **không bấm vào nút chết không phản hồi**.

**Điều kiện chấp nhận**:
- Cho toolbar note chọn, khi xem, thì Labels, Reactions, Comment hiện ở trạng thái vô hiệu (mờ, `aria-disabled`), bấm không làm gì.
- Cho toolbar note sửa, khi xem, thì Comment hiện vô hiệu.
- Cho các nút vô hiệu, khi rê chuột, thì có tooltip báo tính năng chưa có / cần đăng nhập.

## Phân loại

**Phải có (must-have)**: US-1, US-2, US-3, US-4, US-5, US-6, US-7, US-8, US-9
**Nên có (nice-to-have)**: không

## Ngoài phạm vi

- Labels thật (store nhãn theo board, UI quản lý, chip trên note, lọc theo nhãn) — tách spec riêng sau.
- Reactions, Comment thật — cần đăng nhập + `canvas-sharing`.
- Convert to Document thật — cần object type Document mới.
- Checklist / ô tick — Milanote note không có, không làm.
- Phím tắt cho các kiểu khối / định dạng mới (Milanote có Ctrl+Shift+1, Ctrl+> ...) — chỉ làm nút trong menu, phím tắt để sau nếu cần.
