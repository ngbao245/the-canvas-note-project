> LEGACY (chuyển 2026-10-13). Spec đã ship, chỉ còn là lịch sử thay đổi. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Task còn mở (nếu có) đã chép sang `.kiro/notes/backlog.md` / `canvas-backlog.md`.

# Yêu cầu — Quản lý phím tắt tập trung

**Trạng thái**: Nháp  
**Cập nhật cuối**: 2026-10-07

## Mục tiêu

Hiện phím tắt nằm rải ở ~10 listener riêng, bảng Cài đặt chép tay nên dễ lệch với code, và thứ tự xử lý phím chỉ ngầm hiểu (capture/bubble, `document`/`window`, ai `stopPropagation`). Tính năng này gom mọi phím tắt về 1 bảng khai báo + 1 bộ điều phối có thứ tự lớp rõ ràng, để app thêm tool mới mà không phải tự viết listener.

## User stories

### US-1: Một nguồn chuẩn cho phím tắt
Là **người phát triển bibo**, tôi muốn **mỗi phím tắt chỉ khai báo 1 lần** (tổ hợp, lớp áp dụng, điều kiện, nhãn) để **bảng Cài đặt và code xử lý không bao giờ lệch nhau**.

**Điều kiện chấp nhận**:
- Cho 1 phím mới được khai báo, khi mở Cài đặt → Phím tắt, thì phím đó hiện đúng nhóm, đúng nhãn, đúng tổ hợp mà không sửa file nào khác.
- Cho 1 phím bị đổi tổ hợp trong khai báo, khi mở Cài đặt, thì bảng hiện tổ hợp mới.
- Cho phím chỉ dùng nội bộ (Tab giữ focus trong modal, Esc đóng popup, Enter xác nhận dialog), khi mở Cài đặt, thì phím đó không hiện trong bảng.

### US-2: Thứ tự lớp rõ ràng, 1 lần bấm = 1 việc
Là **người dùng**, tôi muốn **mỗi lần bấm phím chỉ làm 1 việc ở lớp trên cùng đang mở** để **không bị đóng popup mà mất luôn vùng chọn**.

Thứ tự lớp từ trên xuống: dialog/modal → popup/menu → panel (Unsort) → tool (Canvas). Lớp mở sau nằm trên lớp mở trước. Phím toàn app nằm riêng, luôn chạy.

**Điều kiện chấp nhận**:
- Cho popup View đang mở và đang chọn object, khi bấm Esc, thì chỉ popup đóng, vùng chọn giữ nguyên.
- Cho dialog xác nhận xoá đang mở, khi bấm Esc, thì chỉ dialog huỷ, vùng chọn giữ nguyên.
- Cho dialog xác nhận xoá đang mở, khi bấm Delete / Ctrl+Z / F, thì canvas không phản ứng.
- Cho modal Cài đặt đang mở, khi bấm bất kỳ phím canvas nào, thì canvas không phản ứng.
- Cho panel Unsort đang mở và đang chọn object, khi bấm Esc, thì chỉ panel đóng. Bấm Esc lần nữa thì bỏ chọn.
- Cho 1 lớp có phím nhưng điều kiện không thoả (VD Esc ở Unsort khi panel đóng), khi bấm phím đó, thì phím rơi xuống lớp dưới như chưa có lớp đó.

### US-3: Không chạy phím khi đang gõ chữ
Là **người dùng**, tôi muốn **phím tắt canvas không chạy khi tôi đang gõ** trong input, textarea, note, ô tên board để **gõ chữ không bị biến thành lệnh**.

**Điều kiện chấp nhận**:
- Cho focus trong note đang sửa, khi bấm F / 0 / Delete / Ctrl+A, thì chỉ editor xử lý, canvas không phản ứng.
- Cho focus trong ô nhập URL của popup Link, khi bấm Esc, thì popup đóng (phím lớp popup được phép chạy khi đang gõ).
- Cho focus trong ô sửa tên board, khi bấm Enter / Esc, thì ô tên tự xử lý như hiện tại.

### US-4: Phím không phụ thuộc Caps Lock và bố cục bàn phím
Là **người dùng**, tôi muốn **phím chữ chạy giống nhau dù bật Caps Lock** để **không phải đoán vì sao phím lúc chạy lúc không**.

**Điều kiện chấp nhận**:
- Cho Caps Lock bật, khi bấm Ctrl+A trong Unsort, thì chọn hết item Unsort (hiện tại không chạy).
- Cho Caps Lock bật, khi bấm F / Ctrl+D / Ctrl+Shift+U, thì chạy như khi tắt.
- Cho bố cục bàn phím khác, khi bấm Ctrl+Shift+< / >, thì vẫn nhận theo phím vật lý (giữ hành vi hiện tại).

### US-5: Báo trùng phím lúc phát triển
Là **người phát triển bibo**, tôi muốn **được cảnh báo khi 2 phím cùng tổ hợp trong cùng lớp** để **không vô tình đè phím của nhau khi thêm tool mới**.

**Điều kiện chấp nhận**:
- Cho 2 khai báo cùng lớp, cùng tổ hợp, khi chạy bản dev, thì console hiện cảnh báo nêu tên 2 phím.
- Cho 1 phím ở lớp tool trùng tổ hợp với phím toàn app, khi chạy bản dev, thì cũng cảnh báo.
- Bản build production không chạy phần kiểm tra này.

### US-6: Giữ nguyên toàn bộ phím đang có
Là **người dùng**, tôi muốn **mọi phím đang dùng vẫn chạy như cũ** sau khi chuyển để **không phải học lại**.

**Điều kiện chấp nhận**:
- Cho từng phím trong danh sách Cài đặt hiện tại (24 dòng), khi bấm trong tình huống tương ứng, thì kết quả như trước khi chuyển. Ngoại lệ có chủ đích duy nhất: các chỗ ở US-2 (1 lần bấm = 1 việc) và US-4 (Caps Lock).
- Cho Space giữ + kéo chuột, khi thả Space, thì hết chế độ kéo màn hình như cũ.
- Cho Ctrl+= / Ctrl+- / Ctrl+0, khi bấm, thì vẫn đè zoom trang của trình duyệt.

## Phân loại

**Phải có (must-have)**: US-1, US-2, US-3, US-4, US-6  
**Nên có (nice-to-have)**: US-5

## Ngoài phạm vi

- Người dùng tự đổi phím (đợt sau; bảng chung đã chừa đường cho việc này).
- Hiện ký hiệu Mac (⌘, ⌥) trong bảng Cài đặt. Giữ chữ "Ctrl" như hiện tại.
- Phím riêng bên trong editor Tiptap (Esc / Ctrl+Enter thoát edit, Ctrl+B...). Editor tự lo, chỉ cần không bị lớp khác chen ngang.
- Phím gắn thẳng trên 1 ô nhập đang focus (ô tên board, ô URL Link): giữ xử lý tại chỗ.
- Hiện gợi ý phím trong tooltip nút (VD "Undo (Ctrl+Z)") lấy từ bảng chung.

---

## Đợt 2: macOS (thêm 2026-10-07)

Bổ sung sau khi rà hành vi trên Mac. Mục "Hiện ký hiệu Mac" ở phần Ngoài phạm vi đã làm (nhãn ⌘ ⌥ ⇧ tự đổi theo OS).

### US-7: Chọn thêm object đúng thói quen Mac
Là **người dùng Mac**, tôi muốn **Cmd + click để chọn thêm object**, còn Ctrl + click vẫn là chuột phải, để **không bị chọn thêm và mở menu cùng lúc**.

**Điều kiện chấp nhận**:
- Cho máy Mac, khi Cmd + click lên object, thì object được thêm/bớt khỏi vùng chọn, không mở menu.
- Cho máy Mac, khi Ctrl + click lên object hoặc vùng trống, thì chỉ mở context menu, vùng chọn không đổi, không kéo màn hình.
- Cho máy Mac, khi Cmd + kéo vùng trống, thì kéo màn hình (như Ctrl + kéo trên Windows).
- Cho Windows/Linux, khi Ctrl + click / Ctrl + kéo, thì chạy như hiện tại.
- Cho mọi OS, khi Ctrl hoặc Cmd + lăn chuột / chụm 2 ngón, thì vẫn zoom (không đổi).

### US-8: Cmd+[ / ] không đẩy ra khỏi canvas
Là **người dùng Mac**, tôi muốn **bấm Cmd+[ / ] trong canvas không làm trình duyệt quay lại trang trước** để **không mất chỗ đang làm khi lỡ bấm lúc chưa chọn gì**.

**Điều kiện chấp nhận**:
- Cho canvas đang mở và không chọn object nào, khi bấm Ctrl/Cmd + [ hoặc ] (có hoặc không Shift), thì không có gì xảy ra, trình duyệt không Back/Forward.
- Cho đang chọn object, khi bấm các phím trên, thì sắp lớp như hiện tại.
- Cho đang gõ trong note / ô nhập, thì phím không bị canvas nuốt (giữ US-3).

### US-9: Tự chọn kiểu bàn phím khi detect sai
Là **người dùng**, tôi muốn **chọn kiểu bàn phím Tự động / macOS / Windows-Linux trong Cài đặt** để **sửa được khi app nhận sai máy** (remote desktop, iPad gắn bàn phím, đổi user agent).

**Điều kiện chấp nhận**:
- Cho lần đầu vào app, thì mặc định là Tự động và nhãn phím theo máy thật.
- Cho chọn macOS / Windows-Linux, khi xem modal phím tắt, Cài đặt, tooltip, thì nhãn đổi ngay, không cần tải lại trang.
- Cho chọn macOS, thì hành vi click ở US-7 cũng theo macOS.
- Cho F5, thì lựa chọn được giữ (lưu trên máy này, không đồng bộ sang máy khác).
- Bắt phím vẫn nhận cả Ctrl lẫn Cmd ở mọi lựa chọn.

**Phân loại đợt 2**: Phải có US-7, US-8. Nên có US-9.

**Ngoài phạm vi đợt 2**: cuộn mượt cho trackpad, pinch trên Safari (GestureEvent), combo đè riêng cho Mac, phím nhả khi giữ Cmd. Để đợt sau, cần thử trên Mac thật.
