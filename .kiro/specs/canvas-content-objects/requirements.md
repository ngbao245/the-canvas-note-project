# Yêu cầu — Canvas Content Objects (Phase B)

**Trạng thái**: Nháp
**Cập nhật cuối**: 2026-09-17

## Mục tiêu

Thay rect debug của Phase A bằng object nội dung thật: Note (ghi chữ), Image (ảnh), Link (URL có favicon). Thêm toolbar palette dọc kiểu Milanote để tạo object. Toàn bộ chạy offline qua IndexedDB. Kiến trúc renderer registry để phase sau (và plugin) thêm object type mới không phải đụng engine core.

## Bối cảnh

- Phase A đã xong: pan/zoom, drag/resize, select/marquee, xoá, undo/redo, IndexedDB persist. Object hiện là rect debug render inline trong `ObjectsLayer`.
- Phase B là bước "canvas có nội dung thật để dùng". Tham chiếu Milanote: object là card kéo thả, tạo từ toolbar palette dọc trong canvas.
- Donor `bibo-hub/src/tools/canvas/` có sẵn pattern ObjectShell + registry + 4 object type — đọc để bám pattern, không copy nguyên xi (vỏ UI khác, backend khác).

## Quyết định đã chốt (không hỏi lại)

- **3 object type**: Note, Image, Link. Bỏ Text riêng (Note đã cover việc ghi chữ). To-do/Board/Table/File/Draw để phase sau.
- **Note plain**: title + body text thường. Rich text (Tiptap) hoãn sang Phase C.
- **Note chưa có màu tag** ở Phase B: hoãn sang Phase C (user chưa hình dung palette màu).
- **Image**: nhập từ 3 nguồn — upload (file picker), paste (Ctrl+V ảnh clipboard), drag-drop file ảnh từ desktop. Blob lưu IndexedDB store riêng, object chỉ giữ tham chiếu blob.
- **Link nhẹ, offline**: lưu URL + favicon (qua favicon service public) + hostname. KHÔNG fetch title/og:image (cần backend → Phase D). Title mặc định = hostname, user sửa được.
- **Tạo object**: toolbar palette dọc trong canvas (kiểu Milanote). Click → object ra giữa viewport. Kéo từ toolbar → thả tại vị trí con trỏ.
- **Canvas giữ full-screen** route `/canvas`. KHÔNG làm rail + workspace panel (shell app cấp app, để dịp khác).
- **Kiến trúc**: renderer registry + shell chung + content slot theo type. Engine core không biết type cụ thể.
- **Backend**: vẫn IndexedDB, chưa có auth/Supabase.

## User stories

### US-1: Toolbar palette tạo object
Là người dùng, tôi muốn có thanh công cụ dọc trong canvas để tạo object, để không phải nhớ context menu.

**Điều kiện chấp nhận**:
- Cho canvas đang mở, khi nhìn, thì thấy toolbar dọc nổi (kiểu Milanote) với mục: Note, Image, Link và Trash.
- Cho toolbar, khi click 1 mục (VD Note), thì object type đó được tạo ở giữa viewport hiện tại (canvas-space) và auto-select.
- Cho toolbar, khi kéo 1 mục thả xuống canvas, thì object được tạo tại vị trí thả (canvas-space) và auto-select.
- Cho object vừa tạo, khi tạo xong, thì hành động undo được (Ctrl+Z xoá nó).

### US-2: Note object
Là người dùng, tôi muốn tạo Note ghi chữ, để lưu ý tưởng trên canvas.

**Điều kiện chấp nhận**:
- Cho Note mới tạo, khi hiện, thì là card có nền (token `card`), border, hiển thị vùng title + vùng body, placeholder khi rỗng.
- Cho Note, khi double-click, thì vào chế độ sửa, con trỏ focus vào title.
- Cho đang sửa title, khi Enter, thì chuyển focus xuống body.
- Cho đang sửa, khi blur ra ngoài / Escape / Ctrl+Enter, thì thoát sửa và lưu nếu nội dung đổi (undo được).
- Cho Note đã có nội dung, khi reload trang, thì nội dung hiện lại đúng.

### US-3: Image object
Là người dùng, tôi muốn đưa ảnh lên canvas, để gom tư liệu hình.

**Điều kiện chấp nhận**:
- Cho toolbar, khi click Image, thì mở file picker; chọn file ảnh (png/jpg/jpeg/gif/webp) → tạo Image object với ảnh đó, kích thước theo tỉ lệ ảnh (clamp về khung hợp lý).
- Cho canvas đang focus, khi Ctrl+V mà clipboard có ảnh, thì tạo Image object từ ảnh đó tại giữa viewport.
- Cho canvas, khi kéo file ảnh từ desktop thả vào, thì tạo Image object tại vị trí thả.
- Cho file không phải ảnh hợp lệ, khi thả/paste, thì báo lỗi ngắn (toast), không tạo object.
- Cho Image đã tạo, khi reload, thì ảnh hiện lại (blob đọc từ IndexedDB).
- Cho ảnh chưa load xong, khi hiện, thì có skeleton/placeholder; load lỗi → icon ảnh vỡ.

### US-4: Link object
Là người dùng, tôi muốn dán link web lên canvas, để lưu tham chiếu nhận diện được.

**Điều kiện chấp nhận**:
- Cho toolbar, khi click Link, thì hiện dialog nhập URL; nhập URL hợp lệ → tạo Link object.
- Cho canvas đang focus, khi Ctrl+V mà clipboard là 1 URL hợp lệ, thì tạo Link object từ URL đó.
- Cho Link, khi hiện, thì hiển thị favicon (qua favicon service theo hostname) + title (mặc định hostname) + URL.
- Cho favicon load lỗi, khi hiện, thì thay bằng icon globe mặc định.
- Cho Link, khi Ctrl/Cmd+Click, thì mở URL ở tab mới.
- Cho URL không hợp lệ, khi nhập/paste, thì báo lỗi ngắn, không tạo object.
- Cho Link đã tạo, khi reload, thì hiện lại đúng URL + title.

### US-5: Object thao tác được như Phase A
Là người dùng, tôi muốn object mới (Note/Image/Link) drag/resize/select/xoá/undo như rect Phase A, để nhất quán.

**Điều kiện chấp nhận**:
- Cho 1 object bất kỳ, khi drag/resize/select/marquee/Delete/undo-redo, thì hành xử như Phase A (không hồi quy).
- Cho object đang resize, khi kéo, thì content bên trong co giãn theo khung (ảnh giữ object-fit, Note/Link cuộn hoặc cắt gọn).
- Cho min-size, khi resize nhỏ hơn, thì clamp 40x40 (như Phase A).

### US-6: Renderer registry (nền mở rộng)
Là người phát triển, tôi muốn object type đăng ký qua registry, để phase sau / plugin thêm type mới không đụng engine.

**Điều kiện chấp nhận**:
- Cho code canvas, khi đọc tầng render, thì thấy registry map `type -> { renderer, defaultGeometry, defaultData, label }`.
- Cho engine core (coord, camera, actions move/resize/delete), khi chạy, thì KHÔNG đọc field `data` cụ thể của type — chỉ chạm `geometry/type/id/boardId/zIndex`.
- Cho object type mới muốn thêm, khi register, thì toolbar + renderer tự nhận mà không sửa engine.

### US-7: Edit inline nhất quán
Là người dùng, tôi muốn double-click để sửa nội dung mọi object có thể sửa, để thao tác quen tay.

**Điều kiện chấp nhận**:
- Cho Note, khi double-click, thì sửa text.
- Cho Image, khi double-click, thì mở file picker để thay ảnh.
- Cho Link, khi double-click, thì mở dialog sửa URL.
- Cho đang sửa (focus trong input/textarea), khi nhấn Delete/Backspace, thì KHÔNG xoá object (chỉ sửa text) — giữ rule Phase A.

## Phân loại

**Phải có (must-have)**: US-1, US-2, US-3, US-4, US-5, US-6, US-7.
**Nên có (nice-to-have)**: kéo-thả-từ-toolbar (phần drag của US-1 — nếu chậm, làm click-tạo trước); paste ảnh/URL (nếu chậm, làm upload/dialog trước rồi bổ sung).

## Ngoài phạm vi (Phase B)

- Note màu tag (ColorBar) — Phase C.
- Note rich text (Tiptap) — Phase C.
- Fetch metadata Link online (title/og:image) — Phase D (cần backend).
- Connector nối object, snap, alignment, keyboard nudge, copy/paste object, group, z-order — Phase C.
- To-do, Board, Table, File, Draw object — phase sau.
- Sidebar workspace panel + rail + Tools panel + Inspector + Unsort — shell app / Phase D.
- Nested board, sync, provenance — Phase D.
