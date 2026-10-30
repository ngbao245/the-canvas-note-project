# Yêu cầu — Hệ thống chuyển động (motion-system)

**Trạng thái**: Đã duyệt, đã làm, chờ test tay
**Cập nhật cuối**: 2026-10-21

## Mục tiêu

Mỗi loại UI trong bibo có cách xuất hiện, biến mất và phản hồi thao tác riêng, theo cùng một bộ quy ước. Kết quả phải tinh tế, nhanh, liền mạch, không nảy, không làm chậm thao tác, giống cảm giác Linear / Vercel / Milanote. Thêm popup hoặc panel mới sau này thì dùng lại được, không viết lại hiệu ứng.

## Quyết định đã chốt (2026-10-21, không hỏi lại)

- Không thêm thư viện animation. Dùng CSS + một module nhỏ trong app.
- Ba nhóm chuyển động dùng chung token và luật, nhưng cơ chế riêng: vào/ra (keyframes + giữ mount khi thoát), tương tác (class dùng chung), liên tục trên canvas (vòng rAF tự quản, giữ nguyên).
- Tooltip: làm component có độ trễ, chỉ thay `title=` ở nút toolbar canvas và nút header. Chỗ khác giữ `title=`.
- Hover nút toolbar canvas đổi từ 60ms sang mức 120ms như header. Mức 60ms chỉ còn cho thao tác trực tiếp trên object và nhấn nút.
- Chuyển cảnh khi vào board con: để spec sau.
- Đổi ramp zoom sang tính theo thời gian: để spec sau.

## Luật chung (áp cho mọi story)

- Không spring, không nảy, không vượt quá đích. Scale nhỏ nhất 0.96, không phóng quá 1.
- Thoát nhanh hơn vào.
- Không có hiệu ứng nào chặn thao tác: bấm, gõ phím, kéo được ngay khi phần tử bắt đầu hiện.
- Bật giảm chuyển động ở hệ điều hành thì bỏ dịch chuyển và scale, chỉ giữ mờ dần và đổi màu.

## User stories

### US-1: Popup gắn nút mở/đóng mượt
Là **người dùng canvas**, tôi muốn popup của toolbar (màu, kiểu chữ, thêm, link, icon board...) bung ra từ nút và tan đi khi đóng, để thấy rõ popup đến từ đâu mà không bị giật.

**Điều kiện chấp nhận**:
- P1. Cho popup đang đóng, khi bấm nút mở, thì popup mờ dần vào, phóng nhẹ và dịch vài px từ phía nút, trong khoảng 160ms.
- P2. Cho popup đang mở, khi bấm ngoài, bấm lại nút hoặc nhấn Esc, thì popup mờ dần đi trong khoảng 120ms rồi mới gỡ khỏi trang.
- P3. Cho popup lật sang bên trái nút (sát mép phải màn hình), khi mở, thì popup bung ra từ cạnh phía nút (bên phải popup), không từ cạnh sai.
- P4. Cho popup đang tan, khi bấm vào chỗ popup vừa đứng, thì click đi xuống canvas bên dưới, không bị popup đang tan nuốt.
- P5. Cho popup đang tan, khi bấm nút mở lại ngay, thì popup hiện lại bình thường, không kẹt ở trạng thái mờ.
- P6. Cho popup mở, khi nhấn Esc, thì Esc chỉ đóng popup (lớp phím được gỡ ngay khi bắt đầu đóng, không chờ hiệu ứng).

### US-2: Dropdown header và menu chuột phải
Là **người dùng**, tôi muốn menu ở header (View, Export, Help, tài khoản, breadcrumb "...") và menu chuột phải trên canvas xuất hiện mượt, để menu không bật ra cái rụp.

**Điều kiện chấp nhận**:
- D1. Cho menu header đóng, khi bấm nút mở, thì menu mờ dần + phóng nhẹ từ góc gần nút, dịch nhẹ từ trên xuống.
- D2. Cho menu header mở, khi đóng bằng bất kỳ cách nào, thì menu tan đi trong khoảng 60ms.
- D3. Cho canvas, khi chuột phải, thì menu hiện tại con trỏ, nhanh hơn popup (khoảng 120ms vào, 60ms ra).
- D4. Cho menu chuột phải đang mở, khi chuột phải chỗ khác, thì menu chuyển sang vị trí mới, không thấy 2 menu cùng lúc.

### US-3: Modal
Là **người dùng**, tôi muốn hộp xác nhận, bảng phím tắt và Settings mở/đóng phối hợp mượt giữa nền mờ và nội dung, để chuyển sang modal không gắt.

**Điều kiện chấp nhận**:
- M1. Cho hộp xác nhận (xoá board...) hoặc bảng phím tắt, khi mở, thì nền mờ dần riêng, hộp mờ dần + phóng nhẹ + dịch nhẹ lên, cả hai chạy cùng lúc.
- M2. Cho modal đang mở, khi đóng (Huỷ, Esc, bấm nền), thì nền và hộp cùng tan đi trong khoảng 120ms, focus về lại chỗ cũ ngay.
- M3. Cho Settings (toàn màn hình), khi mở, thì mờ dần + dịch nhẹ, không phóng.
- M4. Cho modal đang tan, khi gõ phím, thì phím không còn bị modal chặn.

### US-4: Panel từ cạnh
Là **người dùng canvas**, tôi muốn panel Khay chờ (Unsort) trượt vào từ cạnh phải và trượt ra khi đóng, để cảm giác panel nằm sẵn bên cạnh.

**Điều kiện chấp nhận**:
- N1. Cho panel đóng, khi mở, thì panel trượt vào từ cạnh phải trong khoảng 220ms, chậm dần cuối.
- N2. Cho panel mở, khi đóng, thì panel trượt ra trong khoảng 160ms.
- N3. Cho panel đang trượt ra, khi bấm mở lại, thì panel quay đầu từ vị trí đang dở, không nhảy.
- N4. Cho panel đóng, khi nhấn Tab hoặc phím tắt của panel, thì không phần tử nào trong panel nhận focus hoặc phím.
- N5. Cho panel mở/đóng, thì nút mở Khay chờ hiện lại/biến mất bằng mờ chéo, không chớp.

### US-5: Nút toolbox và header phản hồi
Là **người dùng**, tôi muốn nút trên toolbar và header có hover mượt và có cảm giác nhấn, để biết nút đang phản hồi.

**Điều kiện chấp nhận**:
- B1. Cho nút toolbar hoặc header, khi rê chuột vào/ra, thì nền và màu icon đổi mượt trong khoảng 120ms (cả toolbar canvas, không còn 60ms).
- B2. Cho nút icon, khi nhấn giữ, thì nút lún nhẹ (khoảng 96%) gần như ngay lập tức; nhả ra thì trở về mượt. Không làm xô nút bên cạnh.
- B3. Cho dòng trong menu, khi rê nhanh qua nhiều dòng, thì nền chỉ ở dòng đang trỏ, không kéo vệt.
- B4. Cho nút disabled, khi rê chuột hoặc nhấn, thì không đổi nền, không lún.
- B5. Cho focus bằng bàn phím, thì viền focus hiện ngay, không chạy hiệu ứng.
- B6. Cho ô chọn màu, khi rê chuột, thì hiện viền, ô không phóng to.
- B7. Nút thùng rác vẫn đổi sang màu đỏ khi hover như cũ, chỉ chuyển màu mượt.

### US-6: Tooltip có độ trễ
Là **người dùng**, tôi muốn nút icon ở toolbar và header hiện tên + phím tắt sau một nhịp ngắn, để không phải chờ tooltip trình duyệt (~1 giây) và không bị tooltip nhảy ra khi chỉ rê ngang qua.

**Điều kiện chấp nhận**:
- T1. Cho nút toolbar hoặc header, khi giữ chuột yên khoảng 500ms, thì tooltip mờ dần hiện ở phía không bị che (toolbar dọc trái → bên phải nút; header → bên dưới).
- T2. Cho tooltip đang hiện, khi rê sang nút kế trong vòng 300ms, thì tooltip nút kế hiện ngay, không chờ lại.
- T3. Cho tooltip đang hiện, khi rời nút, nhấn chuột hoặc nhấn Esc, thì tooltip mất ngay.
- T4. Cho nút đang mở popup của nó, thì không hiện tooltip của nút đó.
- T5. Cho focus bàn phím vào nút, thì tooltip hiện (không cần rê chuột).
- T6. Cho thiết bị cảm ứng, khi chạm nút, thì không hiện tooltip.
- T7. Các nút đã có tooltip mới thì không còn hiện thêm tooltip của trình duyệt (không bị 2 tooltip). Đổi ngôn ngữ thì tooltip đổi theo.

### US-7: Thông báo và banner
Là **người dùng**, tôi muốn thông báo trên canvas, banner cập nhật và nhãn mất mạng hiện/ẩn mượt, để chúng không nhảy ra giữa lúc đang làm.

**Điều kiện chấp nhận**:
- S1. Cho thông báo canvas, banner cập nhật, nhãn offline, khi xuất hiện, thì mờ dần + dịch nhẹ từ cạnh gắn.
- S2. Khi biến mất (tự ẩn hoặc online lại), thì mờ dần đi, không biến mất cái rụp.

### US-8: Chuyển động liên tục trên canvas giữ nhất quán
Là **người dùng canvas**, tôi muốn kéo, pan, zoom vẫn bám tay như hiện tại, chỉ phần trang trí theo cùng quy ước.

**Điều kiện chấp nhận**:
- C1. Kéo object, khung chọn, pan, zoom bánh xe: không thay đổi cảm giác so với hiện tại.
- C2. Thả object, card trượt vào chỗ khớp vẫn như cũ (khoảng 120ms), lấy thời gian từ token chung.
- C3. Bật giảm chuyển động: thả object thì nhảy thẳng vào chỗ khớp; chấm trạng thái lưu, nhãn "đang sửa ở tab khác", skeleton không nhấp nháy/chớp nữa. Spinner tải vẫn quay.

### US-9: Giảm chuyển động một nguồn
Là **người dùng nhạy với chuyển động**, tôi muốn bật giảm chuyển động ở hệ điều hành là toàn app tôn trọng.

**Điều kiện chấp nhận**:
- R1. Cho giảm chuyển động bật, khi mở popup, menu, modal, panel, tooltip, toast, thì không có dịch chuyển hay phóng, chỉ mờ dần ngắn (panel thì hiện thẳng, không trượt).
- R2. Đổi cài đặt hệ điều hành lúc app đang mở thì áp ngay, không cần tải lại.

### US-10: Dễ mở rộng cho người viết code
Là **người phát triển bibo**, tôi muốn thêm popup / panel / modal mới chỉ bằng cách chọn đúng loại chuyển động có sẵn, để không viết keyframes hay số ms mới.

**Điều kiện chấp nhận**:
- E1. Doc chung (`02-ui-common.md`) có bảng: loại component → hiệu ứng vào, ra, gốc, thời gian.
- E2. Luật kiểm tra tự động báo lỗi khi viết thời gian / easing cứng ngoài file token.
- E3. Không còn chỗ nào trong app tự viết lifecycle vào/ra riêng ngoài cơ chế chung.

## Phân loại

**Phải có**: US-1, US-2, US-3, US-4, US-5, US-6, US-9, US-10
**Nên có**: US-7, US-8

## Ngoài phạm vi

- Chuyển cảnh khi vào / ra board con (spec sau).
- Ramp zoom tính theo thời gian thay vì theo frame (spec sau, đụng `camera-engine`).
- Lựa chọn "giảm chuyển động" trong Settings (thiết kế sẵn chỗ gắn, chưa làm UI).
- Landing (`src/routes/landing/`): đã có cách riêng và đã dùng token, giữ nguyên.
- Đổi chỗ / sắp xếp lại object có hiệu ứng layout.
- Thay `title=` ở các chỗ ngoài toolbar và header.
