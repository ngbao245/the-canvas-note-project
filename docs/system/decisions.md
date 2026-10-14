# Sổ quyết định

Cập nhật: 2026-10-14

Ghi quyết định bạn đã chốt: ngày, quyết gì, vì sao, thay quyết định nào. Hành vi hiện tại xem các phần `01`–`30`; file này chỉ giữ lý do. Mới nhất ở trên. Quyết định bị thay thì giữ dòng cũ, ghi "THAY bởi ...".

Câu đã ghi ở đây là "ĐÃ CHỐT", không hỏi lại.

## 2026-10-14

| Quyết | Vì sao | Thay / ghi ở |
|---|---|---|
| Undo theo từng board (đã làm): lệnh vào stack board đang xem lúc làm, kể cả lệnh đổi dữ liệu board khác; giữ 100 bước mỗi board; board bị xoá vẫn giữ stack; F5 mất | Kiro tự chọn theo hướng đã chốt 2026-10-13, giống Milanote (undo theo chỗ đang đứng). Đổi được nếu bạn muốn khác | `10` mục Undo / redo, `INV-CANVAS-20` |

## 2026-10-13

| Quyết | Vì sao | Thay / ghi ở |
|---|---|---|
| Sơ đồ kiến trúc: server giả và Supabase là 1 khối "Server" (giả ở dev → Supabase) | Server giả đứng thay Supabase, cùng dạng gói; `canvas-sync` chỉ đổi đích | `docs/architecture-diagram/` |
| Undo sau khi đổi board: giải quyết triệt để (ĐÃ LÀM 2026-10-14): lịch sử undo riêng từng board + lệnh undo / redo chỉ đưa vào store object thuộc board đang xem | Không mất undo khi quay lại board, không hiện nhầm object board khác | `10` Câu còn mở, handoff |
| Kéo nhiều object: preview vẽ cả cụm, không ẩn object khác; board tile cộng đúng số object đang kéo (ĐÃ LÀM 2026-10-14, bạn báo) | Object chưa thả vẫn thuộc board này nên phải thấy; số +1 sai khi kéo nhiều | `10` `INV-CANVAS-21` |
| Unsort chỗ chèn + vạch chèn đo vị trí thật từng item, bỏ bước cố định 148px (ĐÃ LÀM 2026-10-14; thử MCP thấy lệch thật: vạch nằm dưới item cuối khi con trỏ ở giữa item ngắn) | Item cao 60–140 không đều, bước cố định lệch | `10` mục Unsort |
| Fit, giới hạn pan, zoom tối thiểu, kéo ra mép bỏ item Unsort; số "N mục" ở header vẫn đếm cả Unsort (đã làm) | Item Unsort không vẽ trên canvas; số ở header là tổng của board | `10` `INV-CANVAS-18` |
| Delete vùng chọn có board tile + object khác: xoá hết, dialog đếm cả 2, 1 bước undo (đã làm) | Xoá đúng cái người dùng chọn | `10` |
| Nhân bản / dán board tile = nhân bản cả board (chưa làm, cần spec) | 2 tile trỏ 1 board làm xoá / đếm rối; giống Milanote | `canvas-backlog.md` |
| Token màu trong Tailwind bọc `color-mix` + `<alpha-value>` để `/15`, `/40` chạy (đã làm) | Sửa 1 chỗ cho mọi class độ mờ, đúng như `coding-style.md` dạy | `02` `INV-UI-13` |
| Nút màu note đọc qua `parseNoteData` (đã làm) | Bịt đường duy nhất làm mất chữ khi dữ liệu lạ | `12` |
| `parseNoteData` gỡ đường chuyển note dạng cũ, chỉ điền mặc định (ĐÃ LÀM 2026-10-14, bạn chọn 3A) | Đã chốt bỏ dữ liệu cũ; bỏ lỗi phụ body chỉ có `<div>` bị escape thành chữ | `12` |
| Xoá vào thùng rác không hỏi lại; thùng rác có popup "đã xoá gần đây" (chưa làm) | Lấy lại được thì không cần hỏi | `10` Câu còn mở, `canvas-backlog.md` |
| Gỡ loại object `rect` | Không còn đường tạo, dữ liệu cũ đã bỏ; `11` đủ khuôn thêm loại mới | `11` |
| `11-object-types` viết riêng, ngắn | Khuôn cho Image / Link / Line sau này | `11` |
| `version` đóng dấu từ số trên đĩa trong cùng transaction, bỏ bộ đếm theo tab | Undo / tab khác làm số lùi, trùng; cần đúng trước khi có server | `20` `INV-DATA-03` |
| Xoá board có con không gói 1 transaction: ghi hiện trạng, chưa sửa | Chỉ xảy ra khi đóng tab đúng lúc xoá; sửa đụng `21` | `20` Câu còn mở, handoff |
| "Áp cả nhóm" để quyết cùng thiết kế RPC `canvas-sync` | Chưa có server thật; cách giữ `groupId` qua nhiều lần gộp cần quyết cùng RPC | `21` Câu còn mở |
| Keepalive lúc đóng tab có thể thiếu thay đổi cuối: giữ | Không mất gì (còn trong outbox); chờ ghi trong `pagehide` có thể hụt luôn lần gửi | `21` |
| Sơ đồ đồng bộ sửa "2s" → "1s" rồi vẽ lại | Khớp code (cửa sổ 1s) | `docs/sync-diagrams/` |
| Bộ doc hệ thống `docs/system/`, chia phần, khuôn cố định, mã `INV-*` | 4 lần lệch spec / note / code trong 1 ngày; sự thật rải ở handoff 1.000+ dòng + 18 spec | `00-map` |
| Tên file luôn tiếng Anh, nội dung tiếng Việt | Thống nhất | — |
| Mọi markdown không dùng nữa gom ở `docs/legacy/`, chưa xoá | Repo chưa commit lần nào, xoá là mất | `00-map` |
| Handoff chỉ ghi việc dở / chờ test / chỗ hở; không nhật ký, không kiến trúc | File cũ 1.097 dòng lệch code | `.kiro/notes/canvas-session-handoff.md` |
| Backlog chỉ ghi tính năng chưa làm | Tách khỏi lịch sử | `canvas-backlog.md`, `backlog.md` |
| Đổi stack phải sửa bảng Stack `01-core` trước (thay spec `bibo-foundation`) | 1 nguồn chuẩn cho stack | `01` `INV-CORE-08` |
| Doc không ghi số phiên bản thư viện (chỉ ghi gói nào ghim) | Không lệch khi nâng bản | `01` |
| Thử offline: `npm run preview:offline` (cổng 4173 cố định) | 1 lệnh, tránh service worker lẫn cổng | `01` |
| Gỡ trang thử `/thu/*` khỏi router, giữ file, đánh giá sau | Coi như phần mở rộng, không có link dẫn tới | `.kiro/notes/backlog.md` |
| `conventions.md` vào legacy, chỉ giữ luật "icon chỉ `lucide-react`" | Nửa file sai code, phần còn lại trùng `coding-style.md` | `coding-style.md` |
| Đăng nhập nằm trong app (Supabase Auth), bỏ service SSO `bibo-auth` | Sản phẩm chỉ có landing + app | `01` bảng Stack |
| Thứ tự: `canvas-outbox` (server giả) → đăng nhập → `canvas-sync` → `canvas-sharing` | Test cơ chế gom request sớm | `21` |
| Supabase: board ở 1 project chính, file chia nhiều project, chuẩn bị gán người theo project | Tăng dung lượng gói Free | `docs/supabase-setup.md` |
| Cửa sổ gom 1s có trần cho cả chữ lẫn thuộc tính | Kéo lẻ từng item từng ra 1 request / lần | `21` `INV-SYNC-04`. THAY "thuộc tính gửi ngay, chữ ~2s" (2026-10-09) |
| Gửi theo trường (create / patch / delete) | Request nhẹ, 2 thay đổi khác trường không đè nhau | `21` `INV-SYNC-03` |

## 2026-10-12

| Quyết | Vì sao | Thay / ghi ở |
|---|---|---|
| Unsort theo từng board, không làm Unsort chung | Bạn kiểm lại thấy đúng | `10` `INV-CANVAS-09` |
| 1 database IndexedDB tự bọc, bỏ `idb-keyval`, bỏ dữ liệu cũ | Outbox cần ghi chung transaction với object | `20` |
| Mở app offline bằng `vite-plugin-pwa`, chỉ bản build app, không tự tải lại | Tải lại giữa lúc gõ làm mất chữ | `01` `INV-CORE-05` |

## 2026-10-09 → 10-11

| Quyết | Vì sao | Thay / ghi ở |
|---|---|---|
| Khoá note theo người CHỌN (giống Milanote), có nút × giành quyền | Milanote cũng khoá giữa tab / thiết bị cùng tài khoản | `20`, `12` |
| Hàng đợi ghi máy kiểu Google Docs, không debounce | Đo thấy đủ gom; debounce dễ mất chữ khi tắt tab | `20` `INV-DATA-10` |
| Xung đột: bản thua thành note "bản xung đột" vào Unsort | Không đè, không mất chữ | `21` Câu còn mở (chưa làm) |
| Khoá có hạn: 30s "mất kết nối", 5 phút tự nhả | Không treo khoá khi rớt mạng | `21` Câu còn mở (chưa làm) |
| Backend Supabase; ghi qua RPC HTTP, realtime qua Broadcast / Presence | Nhịp 1s nên HTTP đủ | `01` bảng Stack, `21` |

## Trước 2026-10-09

| Quyết | Vì sao | Thay / ghi ở |
|---|---|---|
| Đồng bộ chữ: khoá note trước, chừa đường lên Yjs cho kênh chữ (2026-10-08) | Yjs ngay thì server phức tạp, đổi dữ liệu note | `canvas-backlog.md` |
| Không cho mời người ở board Home (2026-10-08) | Home là không gian riêng | `canvas-backlog.md` |
| Theme mặc định sáng (2026-10-05) | — (ghi trong `theme-store.ts`) | `02` |
| Không tiền tố URL ngôn ngữ; tên board mặc định luôn tiếng Anh (2026-10-05) | Link chia sẻ theo người xem; tên lưu vào dữ liệu | `03` |
| Bỏ quy ước `boardId: null` = Home (2026-10-05) | Home cũng là id thật | `20` |
| URL board chỉ dùng id (2026-10-02) | Đổi tên không đổi link | `10` `INV-CANVAS-16` |
| Hút cạnh cùng loại, chỉ lúc thả, luôn bật, không đường gióng (2026-10-02) | Giống Milanote | `10` `INV-CANVAS-17` |
| Ctrl+V lệch dần +16, không dán tại chuột (2026-09-23) | Giống Milanote | `10` `INV-CANVAS-11` |
| Không làm hút lưới (snap-to-grid) | Milanote không có | `canvas-backlog.md` |
