# Yêu cầu — Outbox + server giả (canvas-outbox)

**Trạng thái**: Đã duyệt 2026-10-13  
**Cập nhật cuối**: 2026-10-13

## Mục tiêu

Dựng chiều gửi đi của đồng bộ (outbox) và test được cơ chế gom request ngay bây giờ, chưa cần Supabase và đăng nhập. Server giả chạy trong `npm run dev`, nhận request thật (thấy trong tab Network). Khi nối Supabase (`canvas-sync`), chỉ thay đích gửi, logic gom giữ nguyên.

Vấn đề cần tránh (bàn 2026-10-13): 1 thao tác = 1 request. Cái cần đo là số request gửi đi.

Nguồn thiết kế đã chốt: `.kiro/notes/milanote-sync-architecture.md` mục 2.2, 2.3, 2.5, 2.7.

## Đã chốt trong chat (2026-10-13)

- Server giả: đường dẫn giả trong `npm run dev`, request thật. Bản build không có.
- Cửa sổ gom: cố định 1 giây.
- Chỉ chiều gửi đi. Chiều nhận về (lấy bản server khi mở board, gộp theo version, xử lý xung đột) để `canvas-sync`.
- Làm trước đăng nhập (đảo thứ tự, đã ghi `core.md`).

## User stories

### US-1: Mỗi thay đổi có mục chờ gửi, ghi cùng lúc với object
Là **bạn**, tôi muốn mỗi thay đổi object được ghi kèm 1 mục "chờ gửi" ngay trên máy để không thay đổi nào bị bỏ sót khi gửi lên server.

**Điều kiện chấp nhận**:
- Cho bạn kéo, gõ, đổi màu, xoá 1 object, khi thay đổi xuống IndexedDB, thì có đúng 1 mục chờ gửi cho object đó, ghi trong cùng 1 transaction với object (object xuống thì mục xuống, lỗi thì cả 2 không xuống).
- Cho 1 object sửa nhiều lần trước khi gửi, khi xem các mục chờ gửi, thì vẫn chỉ có 1 mục cho object đó (gộp), giữ phiên bản lúc bắt đầu sửa để sau này phát hiện xung đột.
- Cho object đã có mục chờ gửi kiểu sửa, khi xoá object, thì mục đổi thành xoá.
- Cho bản build (không chạy dev), khi dùng app, thì không ghi mục chờ gửi nào (chưa có server thật để gửi).

### US-2: Gom theo cửa sổ 1 giây, 1 request mang nhiều thay đổi
Là **bạn**, tôi muốn các thay đổi trong 1 giây được gửi chung 1 request để server không phải nhận 1 request mỗi thao tác.

**Điều kiện chấp nhận**:
- Cho thay đổi đầu tiên sau lúc rảnh, khi đủ 1 giây, thì gửi 1 request chứa mọi mục đang chờ (mọi object). Không chờ ngừng gõ: gõ liên tục vẫn gửi ít nhất mỗi ~1 giây.
- Cho kéo 5 item lẻ trong 1 giây, khi gửi, thì chỉ 1 request.
- Cho gõ liên tục 10 giây, khi đếm, thì khoảng 10 request (không phải 1 request mỗi phím).
- Cho 1 thao tác nhiều object (kéo nhiều, nhân bản, dán, xoá board có con), khi gửi, thì các object của thao tác đó nằm chung 1 request, server áp cả cụm hoặc không gì.

### US-3: Gửi ngay khi rời
Là **bạn**, tôi muốn phần còn chờ được gửi ngay khi tôi thoát sửa note, đổi board, ẩn tab hoặc đóng tab để server không tụt sau.

**Điều kiện chấp nhận**:
- Cho có mục chờ, khi thoát sửa note / đổi board / ẩn tab, thì gửi ngay, không chờ hết cửa sổ.
- Cho có mục chờ, khi đóng tab, thì cố gửi bằng request vẫn chạy sau khi trang đóng. Đây chỉ là cố gắng: không chắc tới nơi, an toàn nằm ở US-5.

### US-4: Lỗi thì giữ lại và thử lại, không gửi trùng
Là **bạn**, tôi muốn request lỗi không làm mất thay đổi và gửi lại không làm server áp 2 lần.

**Điều kiện chấp nhận**:
- Cho request lỗi (server trả lỗi hoặc không tới được), khi xem mục chờ, thì mục vẫn còn; lần thử sau chờ lâu dần (1s, 2s, 4s… tối đa 30s).
- Cho request đã tới server nhưng máy không nhận được trả lời, khi gửi lại, thì server nhận ra mục trùng và không áp lần 2.
- Cho object được sửa tiếp trong lúc request đang bay, khi server xác nhận, thì mục của object đó vẫn giữ lại để gửi bản mới ở lượt sau (không xoá nhầm).

### US-5: Mất mạng / đóng tab giữa chừng thì lần sau gửi tiếp
Là **bạn**, tôi muốn sửa lúc mất mạng hoặc đóng tab trước khi gửi xong vẫn được gửi khi có lại điều kiện.

**Điều kiện chấp nhận**:
- Cho đang offline, khi sửa, thì không gửi; có mạng lại thì gửi ngay phần đã dồn.
- Cho còn mục chờ, khi đóng tab rồi mở lại app, thì app gửi tiếp các mục đó.

### US-6: Chỉ 1 tab gửi
Là **bạn**, tôi muốn mở nhiều tab vẫn chỉ 1 tab gửi để không gửi trùng và không nhân số request.

**Điều kiện chấp nhận**:
- Cho 2 tab cùng mở, khi sửa ở tab nào, thì chỉ 1 tab gửi request. Tab gửi đóng → tab còn lại tự nhận việc gửi.

### US-7: Trạng thái đồng bộ
Là **bạn**, tôi muốn thấy thay đổi đã lên server chưa, không bị báo "Đã lưu" khi chưa đồng bộ (chỗ Milanote làm sai).

**Điều kiện chấp nhận**:
- Có 3 trạng thái: **Đã lưu trên máy** (còn mục chờ, đang chờ gửi), **Đã đồng bộ** (hết mục chờ), **Chưa đồng bộ** (offline hoặc đang thử lại sau lỗi).
- Chỉ hiện khi outbox đang bật (dev). Bản build giữ trạng thái lưu như hiện tại.

### US-8: Đo và điều khiển trong bảng dev
Là **bạn**, tôi muốn đo số request và giả lập mạng xấu ngay trong bảng dev.

**Điều kiện chấp nhận**:
- Bảng dev có mục "Outbox", dùng chung chế độ Phiên / Liên tục và nhãn kịch bản: số request, object trung bình / lớn nhất mỗi request, thời gian request, số lỗi, số lần thử lại, số mục đang chờ, số mục server bỏ vì trùng, số lần lệch phiên bản.
- Điều khiển server giả: độ trễ (0 / 200ms / 1s / 3s), tỉ lệ lỗi (0 / 20% / 50%), giả lập offline, xoá dữ liệu server.
- Nút "So với server": so mọi object trên máy với server giả, báo khớp hoặc lệch bao nhiêu object (đã trừ phần còn chờ gửi).
- Copy kết quả như mục hàng đợi ghi.

### US-9: Gửi theo trường, không gửi nguyên object (bổ sung 2026-10-13)
Là **bạn**, tôi muốn mỗi request chỉ mang phần đã đổi để request nhẹ và 2 thay đổi khác phần của cùng object không đè nhau.

**Điều kiện chấp nhận**:
- Cho note dài, khi chỉ kéo, thì request chỉ mang vị trí / kích thước, không mang nội dung chữ.
- Cho đổi màu rồi sửa chữ trong cùng cửa sổ, khi gửi, thì 1 request mang đúng 2 trường đó.
- Cho 2 nơi sửa 2 trường khác nhau của cùng object, khi server áp lần lượt, thì giữ cả 2 thay đổi.
- Cho object server chưa có (vừa tạo, server khởi động lại), khi gửi, thì gửi nguyên object.
- Cho đổi màu về mặc định, khi server áp, thì server lưu đúng màu mặc định (không hiểu nhầm là xoá).

## Phân loại

**Phải có**: US-1 đến US-9.  
**Nên có**: chưa có.

## Ngoài phạm vi

- Supabase thật, đăng nhập, quyền, RLS.
- Chiều nhận về: lấy bản server, gộp theo version, xung đột vào Unsort (`canvas-sync`).
- Kênh realtime (con trỏ, xem trước chữ, khoá giữa người).
- Gửi board và camera lên server (chỉ object trong lần này).
- Giảm request tận gốc: 1 cú kéo ghi 2 lần, thả nhiều item tách 2 lô (ghi trong note 2.9, làm riêng).
