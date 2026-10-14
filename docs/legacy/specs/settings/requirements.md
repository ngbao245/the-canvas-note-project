> LEGACY (chuyển 2026-10-13). Spec đã ship, chỉ còn là lịch sử thay đổi. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Task còn mở (nếu có) đã chép sang `.kiro/notes/backlog.md` / `canvas-backlog.md`.

# Yêu cầu — Cài đặt (phần không cần backend)

Vỏ modal Cài đặt đã có (2026-10-05, xem `canvas-session-handoff.md`). Spec này lấp các mục không cần backend.
Ngoài phạm vi: Thanh công cụ (bàn sau), Font (chờ chọn), Tài khoản / Sao lưu / đồng bộ (chờ backend),
Email và thông báo, Ngôn ngữ (tạm không làm).

## US-1: Theme theo hệ thống
Là người dùng, tôi muốn bibo đi theo dark/light của máy để không phải tự đổi.
- Cho mục Giao diện, khi chọn "Theo hệ thống", thì app dùng dark hoặc light theo cài đặt máy.
- Cho đang ở "Theo hệ thống", khi máy đổi dark/light, thì app đổi theo ngay, không cần tải lại.

## US-2: Lưới nền canvas
Là người dùng, tôi muốn ẩn lưới chấm để canvas trông sạch hơn.
- Cho mục Canvas, khi tắt "Lưới nền", thì canvas không còn chấm. Bật lại thì hiện như cũ.
- Lựa chọn giữ sau khi tải lại trang.

## US-3: Tốc độ cuộn
Là người dùng chuột thường, tôi muốn chỉnh tốc độ cuộn canvas cho vừa tay.
- Cho mục Canvas, khi chọn Chậm / Vừa / Nhanh, thì cuộn chuột trên canvas đi quãng ngắn / như cũ / dài hơn.
- Mặc định là Vừa (giữ như hiện tại).

## US-4: Đặt lại mặc định
Là người dùng, tôi muốn quay về mặc định từng nhóm khi chỉnh lung tung.
- Cho mục Giao diện hoặc Canvas, khi bấm "Đặt lại mặc định", thì chỉ nhóm đó về mặc định, nhóm khác giữ nguyên.

## US-5: Danh sách phím tắt
Là người dùng, tôi muốn xem phím tắt đang có để làm nhanh hơn.
- Cho mục Phím tắt, thì thấy danh sách chia nhóm, mỗi dòng có mô tả + phím. Chỉ xem, không sửa.

## US-6: Thông tin dữ liệu
Là người dùng, tôi muốn biết bibo đang giữ bao nhiêu dữ liệu trên trình duyệt.
- Cho mục Dữ liệu, thì thấy số board, số object, dung lượng ước tính.
- Đang đếm thì hiện khung chờ đúng chỗ số liệu. Lỗi thì báo lỗi, có nút thử lại.

## US-7: Bàn phím trong modal
Là người dùng bàn phím, tôi muốn Tab không lọt ra khỏi modal.
- Cho modal đang mở, khi Tab tới phần tử cuối, thì quay về phần tử đầu (Shift+Tab ngược lại).

---

# Mở rộng 2026-10-05 — Kích thước giao diện

Thay dòng "Font chữ" trong Giao diện. Học theo mục Interface của Milanote (đã đo trực tiếp trên tài khoản bạn, xem
`design.md` mục "Kích thước giao diện").
Ngoài phạm vi: chọn bộ font, công tắc "font riêng cho tiêu đề" (bạn bỏ, chờ chốt font).

## US-8: Chọn kích thước giao diện
Là người dùng, tôi muốn chữ và card trên canvas to / nhỏ hơn để vừa mắt và vừa màn hình.
- Cho mục Giao diện, thì thấy 3 thẻ Nhỏ / Vừa / Lớn. Vừa có nhãn "Khuyên dùng". Thẻ đang chọn tô viền + nền như thẻ Theme (không tick, bạn chốt 2026-10-05).
- (Đổi 2026-10-06) Cho đang ở Vừa (mặc định), thì canvas trông y như trước khi có setting. Trước đó mặc định là Lớn.
- Khi chọn Nhỏ, thì card, chữ trong card và khoảng cách giữa các card cùng nhỏ lại theo 1 tỉ lệ. Chọn Lớn thì to lên.
  Card không đè lên nhau.
- Toolbar trái và panel Unsort nhỏ lại cùng tỉ lệ.
- (Đổi 2026-10-06, bạn chọn B) Header canvas, menu tài khoản và modal Cài đặt cũng nhỏ lại cùng tỉ lệ, để đổi kích
  thước ngay trong Cài đặt là thấy khác. Trước đó spec giữ nguyên 3 phần này theo Milanote.
- Mức zoom hiện trên header không đổi khi đổi kích thước.
- Lựa chọn giữ sau khi tải lại trang, áp cho mọi board.
- Kéo thả, hút cạnh, chọn vùng, dán, tách đoạn (card clipper), kéo từ toolbar, kéo trong Unsort vẫn đúng chỗ ở cả 3 mức.

## US-9: Phím tắt đổi kích thước
Là người dùng bàn phím, tôi muốn đổi kích thước nhanh mà không mở Cài đặt.
- Cho đang ở canvas, không gõ chữ, khi bấm Ctrl+Shift+<, thì nhỏ đi 1 mức (Nhỏ thì đứng yên). Ctrl+Shift+> to lên 1 mức.
- Cho đang gõ chữ trong Note hoặc ô nhập, thì phím không đổi kích thước.
- Cho mục Phím tắt, thì có dòng cho 2 phím này. Mục Giao diện hiện gợi ý phím cạnh tiêu đề.

## US-4 (bổ sung)
- Cho mục Giao diện, khi bấm "Đặt lại mặc định", thì kích thước cũng về Vừa (đổi 2026-10-06, trước là Lớn).
