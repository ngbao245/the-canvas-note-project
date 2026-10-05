# Yêu cầu — Đa ngôn ngữ (i18n)

**Trạng thái**: Chờ chốt 3 câu ở `design.md` mục "Câu cần chốt" rồi mới duyệt `tasks.md`.
**Tạo**: 2026-10-05, từ session Cài đặt. Session mới làm, xong quay lại session Cài đặt.

## Bối cảnh

- UI hiện lẫn Việt và Anh ("Fit content", "Undo", "objects", "New Board", "Thêm Note").
- Khoảng 250 chuỗi chữ UI trong khoảng 30 file (đếm sơ 2026-10-05). Nhiều nhất: `ShortcutsSection`,
  `NoteToolbar`, `Toolbar`, `SettingsModal`, `AppearanceSection`, `engine/actions.ts`, `CanvasHeader`, `AccountMenu`.
- Mục Cài đặt → Ngôn ngữ và vùng đã có vỏ (`LocalizationSection.tsx`), đang ghi "Chưa đổi được".
- Chưa có backend → lựa chọn ngôn ngữ lưu trên trình duyệt.

## Phạm vi phase 1

Ngôn ngữ: Tiếng Việt + English (English là ngôn ngữ dự phòng). Thêm ngôn ngữ khác sau chỉ cần thêm 1 bộ chữ.

## US-1: Chọn ngôn ngữ
Là người dùng, tôi muốn chọn ngôn ngữ giao diện để dùng bibo bằng tiếng tôi quen.
- Cho Cài đặt → Ngôn ngữ và vùng, khi chọn English, thì toàn bộ chữ UI đổi sang tiếng Anh ngay, không tải lại trang.
- Cho đã chọn, khi tải lại trang, thì giữ ngôn ngữ đã chọn.
- Cho lần đầu mở app và trình duyệt đặt tiếng Việt, thì dùng Tiếng Việt.
- Cho lần đầu mở app và trình duyệt đặt ngôn ngữ khác, thì dùng English.
- Cho đổi ngôn ngữ, thì địa chỉ trang không đổi (không có `/vi`, `/en` trên URL).

## US-2: Không còn chữ lẫn
Là người dùng, tôi muốn UI chỉ một ngôn ngữ để đọc không bị vấp.
- Cho đang ở Tiếng Việt, thì không còn chữ tiếng Anh trên UI (trừ tên riêng: bibo, Canvas, Unsort nếu chốt giữ).
- Cho đang ở English, thì không còn chữ tiếng Việt.
- Áp cho: header, breadcrumb, toolbar, menu chuột phải, NoteToolbar, Unsort, hộp xác nhận, popup tài khoản,
  toàn bộ Cài đặt, loading / empty / error, title và aria-label của nút.

## US-3: Số nhiều và số đếm
Là người dùng, tôi muốn chữ đi kèm số đúng ngữ pháp.
- Cho 1 object, thì English hiện "1 object", 3 thì "3 objects". Tiếng Việt "1 object" / "3 object" (không có số nhiều).
- Số có dấu phân cách theo ngôn ngữ (vi: 1.234, en: 1,234).

## US-4: Ngôn ngữ trang
Là người dùng trình đọc màn hình, tôi muốn trình đọc phát âm đúng tiếng.
- Cho đổi ngôn ngữ, thì thuộc tính `lang` của trang đổi theo (vi / en).

## US-5: Dữ liệu người dùng không bị dịch
Là người dùng, tôi muốn tên board và nội dung note của tôi giữ nguyên khi đổi ngôn ngữ.
- Cho board tôi đã đổi tên, khi đổi ngôn ngữ, thì tên đó không đổi.
- Cho board tạo mới, thì tên mặc định là "New Board" ở mọi ngôn ngữ.
- Cho board hệ thống, thì tên là "Home" ở mọi ngôn ngữ.

## Ngoài phạm vi
- Định dạng ngày, ngày đầu tuần: app chưa hiện ngày giờ. Giữ vỏ "Chưa đổi được".
- Dịch nội dung người dùng (note, tên board).
- Ngôn ngữ viết từ phải sang trái.
- Trang `/thu/*` (experiments) và `StyleDemo`: chỉ dịch nếu tiện, không bắt buộc.
- Landing: chốt ở câu 1.
