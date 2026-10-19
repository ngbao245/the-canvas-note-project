# Thiết kế — Hoàn thiện Note

**Trạng thái**: Nháp

## Màn hình / luồng

Không có màn hình mới. Mọi thay đổi nằm trên note và toolbar note có sẵn.

### Toolbar note — chế độ chọn
Thứ tự nút: Màu, Labels (vô hiệu), Reactions (vô hiệu), Comment (vô hiệu), More.
- More mở menu xổ xuống cạnh nút, gồm 4 mục: Convert to Document (vô hiệu, mờ), Lock Position / Unlock Position (đổi theo trạng thái khoá), Bring to Front, Send to Back.
- Note đang khoá: viền chọn vẫn hiện, nhưng kéo thân hoặc kéo góc đều không di chuyển/đổi cỡ. Chọn/mở sửa/đổi màu vẫn được.

### Toolbar note — chế độ sửa
Thứ tự nút: Text style, Đậm, Nghiêng, Bulleted list, Numbered list, Link, Comment (vô hiệu), More.
- More lúc sửa mở menu định dạng chữ bổ sung (giống Milanote): Code inline (`</>`), Underline (gạch chân), Strikethrough (gạch ngang), Align (căn trái/giữa/phải, dạng nhóm 3 lựa chọn hoặc toggle vòng). Mỗi mục có active state khi đang áp.
- Dùng ToolbarPopup cho menu này; nút trong menu có `onMouseDown preventDefault` để không mất chế độ sửa (giữ `INV-NOTE-10`).

### Popup Text style (mở rộng)
Ba nhóm, cuộn dọc nếu tràn:
1. Kiểu khối: Title (h1), Heading (h2), Subheading (h3), Body (đoạn), Small text, Code block, Callout, Quote.
2. Color (màu chữ): 1 ô mặc định + 5 ô màu. Mỗi ô là chữ "A" tô màu tương ứng. Ô đang áp có viền chọn.
3. Highlight (nền): 1 ô không-nền + 5 ô màu nền. Mỗi ô là chữ "A" nền màu. Ô đang áp có viền chọn.

## Dữ liệu

### NoteData thêm trường `locked`
- `locked: boolean`, mặc định `false`. Lưu trong `data` note (IndexedDB như body/color/heightMode).
- `parseNoteData` điền mặc định `false` khi thiếu / sai kiểu.
- Giữ `INV-NOTE-04`: đọc/ghi qua `parseNoteData`, ghi thì gộp `{ ...parsed, locked }`.

### Màu chữ, highlight, định dạng mới: lưu trong body HTML
- Không thêm trường data. Màu chữ, highlight, underline, strike, code inline, align đều là mark/attribute trong HTML (như bold/italic/link), lưu thẳng trong `body`.
- Thêm vào `NOTE_SCHEMA_EXTENSIONS` (giữ `INV-NOTE-02`): TextStyle + Color (màu chữ), Highlight (nền, multicolor), Underline, TextAlign (cho `heading` + `paragraph`). Strike + Code inline đã có sẵn trong StarterKit (chỉ nối nút, không thêm extension).
- Small text / Code block / Callout: Code block đã có trong StarterKit. Small text + Callout cần node/mark mới hoặc dùng paragraph có attribute — quyết chi tiết khi làm (xem "Quyết định đã hoãn").
- Màu lưu dạng hex (data color exception, như note-colors). Palette màu chữ + highlight khai trong lib riêng, tên màu lưu key dịch.

## Tương tác với tool khác

Không. Toàn bộ trong `src/tools/canvas/`.

## Điều kiện biên

- Note khoá rồi mở sửa (double-click): vẫn vào sửa được (khoá chỉ chặn di chuyển/đổi cỡ, không chặn sửa chữ — khớp Milanote Lock Position).
- Note khoá nằm trong vùng chọn nhiều rồi kéo cả cụm: note khoá không dời theo (hoặc chặn kéo cả cụm nếu có note khoá — quyết khi làm, mặc định note khoá đứng yên, các object khác vẫn kéo).
- Màu chữ / highlight trên body cũ chưa có mark: hiển thị bình thường (không mark = màu mặc định).
- Offline: tất cả work offline, data lưu IndexedDB như hiện tại.
- `sanitizeNoteHtml` phải giữ mark màu/highlight + node mới sau khi thêm vào schema; nếu không thêm đúng vào `NOTE_SCHEMA_EXTENSIONS` thì bộ lọc sẽ xoá (test bằng xem lại note sau F5).

## Quyết định đã hoãn

- Small text và Callout implement bằng gì (node mới / paragraph + attribute class / heading level khác): quyết lúc làm Task tương ứng, ưu tiên cách ít extension nhất mà vẫn qua được `sanitizeNoteHtml`.
- More ở chế độ sửa có nối hay để vô hiệu: mặc định để vô hiệu, nối nếu không phát sinh phức tạp.
- Kéo cụm có note khoá: mặc định note khoá đứng yên, xác nhận lại khi test.
