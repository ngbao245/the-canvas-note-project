# Yêu cầu — Giới hạn pan + kéo lố đàn hồi

**Trạng thái**: Nháp  
**Cập nhật cuối**: 2026-10-16

## Mục tiêu

Pan tự do trong vùng tài liệu của board. Tới rìa thì được kéo lố một đoạn ngắn có lực cản rồi trượt về, không dừng cứng, không trôi vô hạn. Vùng tài liệu giãn theo object, không co trong lúc đang ở board.

## Đã chốt (2026-10-16)

- 1A: board trống giữ vùng 1000 × 800 quanh gốc (0, 0).
- 2A: tài liệu × zoom nhỏ hơn màn thì tài liệu trôi tự do trong màn (không ra khỏi màn), có kéo lố.
- 3A: kéo lố tối đa 15% màn mỗi trục, trần 120px. Hồi về bằng đường giảm tốc rồi dừng, không nảy qua lại (đúng `motion-rules.md`).

## User stories

### US-1: Pan tự do trong tài liệu
Là **người dùng canvas**, tôi muốn **kéo màn khắp vùng tài liệu ở mọi mức zoom** để **xem được mọi chỗ quanh nội dung**.

**Điều kiện chấp nhận**:
- Cho 3 note giữa màn ở 300%, khi kéo màn, thì đi được tới mọi mép tài liệu.
- Cho note sát mép trái / trên của nội dung, khi kéo màn về phía đó, thì thấy được khoảng trống 500 (ngang) / 400 (dọc) sau note.
- Cho tài liệu × zoom nhỏ hơn màn, khi kéo màn, thì tài liệu di chuyển trong màn tới khi mép tài liệu chạm mép màn.
- Cho board trống, khi kéo màn, thì dừng ở vùng 1000 × 800 quanh gốc.

### US-2: Kéo lố đàn hồi ở rìa
Là **người dùng canvas**, tôi muốn **kéo vượt rìa một chút rồi được trả về** để **biết mình tới rìa mà không bị dừng cứng**.

**Điều kiện chấp nhận**:
- Cho camera ở rìa, khi kéo màn tiếp (Space, chuột giữa, Ctrl + kéo), thì màn đi tiếp nhưng nặng dần, không quá 15% màn (tối đa 120px).
- Cho đang kéo lố, khi thả chuột (kể cả thả ngoài cửa sổ), thì màn trượt về rìa, giảm tốc rồi dừng, không nảy qua lại.
- Cho camera ở rìa, khi lăn chuột / cuộn touchpad tiếp, thì màn lố một chút, ngừng lăn khoảng 120ms thì trượt về.
- Cho đang lố, khi bắt đầu zoom, thì màn về rìa trước rồi zoom, không nhảy.
- Cho đang lố, khi F5, thì camera khôi phục ở vị trí trong rìa, không phải chỗ lố.
- Zoom, Fit, Về 100%, tự cuộn lúc kéo object: không kéo lố.

### US-3: Tài liệu giãn theo object, không co trong lúc ở board
Là **người dùng canvas**, tôi muốn **vùng tài liệu mở rộng khi tôi đặt hoặc kéo object ra xa, và giữ nguyên khi object rời đi** để **camera không tự dời và không mất chỗ đã mở**.

**Điều kiện chấp nhận**:
- Cho kéo 1 note ra mép phải và giữ ở vùng tự cuộn, khi màn tự cuộn, thì tài liệu giãn theo note, kéo tiếp được.
- Cho board chỉ có 1 note ở xa gốc, khi kéo note đó, thì camera không bị lôi về gốc.
- Cho kéo note xa về giữa hoặc xoá nó, khi xong, thì camera không tự dời, vẫn kéo màn tới được vùng cũ.
- Cho vào board khác rồi quay lại (hoặc F5), khi board nạp xong, thì tài liệu tính lại từ object hiện có.
- Chỉ di chuyển camera (pan, zoom, kéo lố) không làm tài liệu giãn.

### US-4: Đổi cỡ màn / zoom không giật
Là **người dùng canvas**, tôi muốn **camera trượt về phạm vi khi cửa sổ hoặc Kích thước giao diện đổi** để **không bị nhảy**.

**Điều kiện chấp nhận**:
- Cho camera gần rìa, khi thu nhỏ cửa sổ hoặc đổi Kích thước giao diện, thì camera trượt về trong phạm vi.

## Phân loại

**Phải có**: US-1, US-2, US-3.  
**Nên có**: US-4.

## Ngoài phạm vi

- Nảy qua lại kiểu iOS (cần sửa `motion-rules.md` trước).
- Dời cả board để không có toạ độ âm như Milanote.
- Đo thêm Milanote (board trống, lúc zoom out).
- Quán tính sau khi thả kéo màn.
