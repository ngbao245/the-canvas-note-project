# Sổ quyết định

Cập nhật: 2026-10-15

Ghi quyết định bạn đã chốt: ngày, quyết gì, vì sao, thay quyết định nào. Hành vi hiện tại xem các phần `01`–`30`; file này chỉ giữ lý do. Mới nhất ở trên. Quyết định bị thay thì giữ dòng cũ, ghi "THAY bởi ...".

Câu đã ghi ở đây là "ĐÃ CHỐT", không hỏi lại.

## 2026-10-16

| Quyết | Vì sao | Thay / ghi ở |
|---|---|---|
| Màu chữ / icon trên board và note luôn tự tính theo độ sáng nền, không lưu, không chỉnh tay. Bỏ `Board.iconColor`, `Board.ink`, nhấp đúp đổi chữ, hàng cặp "A" và hàng gợi ý của note. Popup màu (board + note) = phần chữ trắng (ô trơn) / phần chữ đen (ô chia chéo) / màu tuỳ chỉnh đã lưu | Bạn chốt: giống Milanote, chỉ 1 quy tắc, chỉnh màu chỉ ở nút Màu | `11`, `12`. THAY hàng cặp "A" + gợi ý trong dòng "Popup Màu note làm đủ như Milanote" (2026-10-15) |
| Màu tuỳ chỉnh đã lưu dùng chung mọi loại object (note, board), 5 ô, riêng máy; bảng màu tuỳ chỉnh bấm ra ngoài cũng tính là áp | Bạn chốt | `11`, `12` |
| Giới hạn pan 3 lớp: vùng tài liệu (chỉ giãn trong phiên board, gồm object đang kéo), phạm vi camera (tính từ tài liệu × zoom + màn, bỏ khoảng thở), kéo lố tạm thời (spec `canvas-pan-bounce`, ĐÃ LÀM, bạn test OK 2026-10-16) | Bản cũ dừng cứng ở rìa, vùng co làm camera tự dời, kéo object ra xa không tự cuộn được | THAY khoảng thở `SCREEN_SLACK_RATIO` + "tài liệu co ngay" 2026-10-15. `10` Giới hạn pan |
| Touchpad tách khỏi chuột: pan 2 ngón áp thẳng 1:1 không ramp, Cài đặt "Tốc độ cuộn" dùng bảng riêng 0.7 / 1 / 1.4 (chuột giữ 0.3 / 0.5 / 0.8) | Đi chung đường chuột thì nhân 0.5 + ramp 20%/khung → chậm, trễ, trôi | `10` bảng thao tác |
| Pinch: mốc 100% còn 0.12 log2 (trước 0.3); neo đúng ngón tay, không hút về object; ramp đuổi nhanh hơn chuột (`PINCH_RAMP_ALPHA`, áp thẳng thử rồi mất mượt) | Pinch là thao tác trực tiếp, điểm dưới ngón tay phải đứng yên; 0.3 gây cảm giác kẹt | `10` bảng thao tác |
| Lăn chuột ngừng `WHEEL_SETTLE_MS` thì trượt về; touchpad lố thì debounce theo sự kiện (`TOUCHPAD_OVERSCROLL_DEBOUNCE_MS`) nhưng trần `TOUCHPAD_OVERSCROLL_MAX_HOLD_MS` tính từ lúc bắt đầu lố; trần an toàn tài liệu ±100.000 canvas | Quán tính touchpad gửi sự kiện 1-2s sau khi nhấc tay, debounce thuần giữ màn lố mãi | `10` Giới hạn pan |
| Board trống giữ vùng 1000 × 800 quanh gốc | Milanote chưa đo đủ case này; cỡ theo màn dễ sai theo zoom lúc vào | spec `canvas-pan-bounce` |
| Tài liệu × zoom nhỏ hơn màn: tài liệu trôi tự do trong màn, có kéo lố | Đúng ý "pan tự do", không quay lại lỗi khoá trục | spec `canvas-pan-bounce` |
| Kéo lố trần min(15% màn, 120px), trượt về giảm tốc rồi dừng, không nảy qua lại | Nhẹ, mượt, giữ đúng `motion-rules.md` (cấm spring) | spec `canvas-pan-bounce` |

## 2026-10-15

| Quyết | Vì sao | Thay / ghi ở |
|---|---|---|
| Note fixed lúc sửa tạm dài theo chữ (Enter / tràn dòng thấy ngay), chỉ để vẽ, không lưu, không undo; thoát sửa về cao đã kéo, che lại phần thừa | Trước đó gõ Enter là chữ rơi vào vùng mờ, không thấy mình gõ gì | `12` Chiều cao, `INV-NOTE-05` |
| Min size theo loại áp ở MỌI đường đổi cỡ qua `getObjectMinSize`; note rộng ≥ 160 (cao ≥ 68 giữ). Note mới rộng 300 (trước 338) | Engine trước chỉ kẹp 40 chung, loại mới khai `minSize` là tự được giữ; 160 trừ padding còn ~120px chữ; 338 hơi rộng | `10` Resize, `11`, `12` |
| Font app: Inter (thân note + UI), Fraunces (heading note + tên board header), JetBrains Mono (code). Khai 1 chỗ: `@import` trong `index.css` + `fontFamily` sans / serif / mono trong `tailwind.config.ts` | Inter phủ Latin / Cyrillic / Greek / Việt (quốc tế), chấp nhận giống Milanote; Fraunces đã có sẵn, tạo điểm nhấn ở heading | `02`, `12` |
| Nút định dạng chữ (Đậm, Nghiêng, list, Text style, Link...) giữ trong toolbox dọc lúc sửa note. KHÔNG làm thanh định dạng nổi trên note / khi bôi đen chữ. Không thêm gì | 1 chỗ cho mọi thao tác; thanh nổi che object bên cạnh, đụng Card Clipper + góc resize + zoom; list / Text style tác động cả khối, không cần bôi đen; giống Milanote | `12` Toolbar |
| Note tạm đủ chức năng, dừng thêm tính năng note cho tới khi có backend. Còn lại chỉ sửa lỗi từ test tay (NC1–NC8, P1–P4, CC1–CC8). Labels / Reactions / Comment / Convert to Document làm sau khi có backend | Bạn chốt: phần còn thiếu của note cần đăng nhập / đồng bộ | `12`, handoff |
| Popup Màu note làm đủ như Milanote 1 đợt: tab Background / Top strip, 13 màu chuẩn, hàng cặp nền + chữ "A", hàng 7 màu gợi ý, Custom color (spec `canvas-note-color`, ĐÃ LÀM, chờ test CC1–CC8) | Bạn chốt 1A: làm chung 1 lần để dữ liệu chỉ đổi 1 lần | spec `canvas-note-color`. THAY hướng "tách sau, chưa làm" 2026-10-14 |
| Màu note vẫn lưu hex (giữ `INV-NOTE-17`), không lưu tên màu theo theme | Đo Milanote: bộ màu chỉ khai 1 lần ở `:root`, theme sáng / tối dùng chung (trừ xám) | `12` |
| NoteData thêm `background` + `textColor`; `color` giữ nghĩa thanh trên đầu | Note cũ không phải chuyển đổi | `12` bảng dữ liệu |
| Nền không có màu chữ đi kèm → chữ tự tối / sáng theo độ sáng nền (ngưỡng 0.6), không lưu | Giống Milanote `colored-background-light`; tính lúc vẽ nên đổi nền là chữ theo ngay | `12` mục Màu |

## 2026-10-14

| Quyết | Vì sao | Thay / ghi ở |
|---|---|---|
| Hoàn thiện note (spec `canvas-note-complete`, ĐÃ LÀM, chờ test NC1–NC8). Đo Milanote thật trước khi làm (handoff mục "Đo Milanote") | Nối nốt các nút giữ chỗ + định dạng chữ cho đủ parity Milanote | `12`, handoff |
| Thêm định dạng: màu chữ (5), tô nền (5), Small text, Code block, Callout, gạch chân, gạch ngang, code trong dòng, căn lề. Milanote giấu gạch chân / gạch ngang / code trong More lúc sửa → bibo cũng gom vào More | Milanote note có đủ các cái này; checklist thì không có nên bỏ | `12` schema + toolbar |
| Màu chữ / tô nền / căn lề / Small / Callout lưu là mark/attribute trong body HTML, extension vào `NOTE_SCHEMA_EXTENSIONS`, KHÔNG thêm trường data | 1 nguồn (schema) cho cả editor lẫn bộ lọc; xem lại sau F5 không mất định dạng | `12` `INV-NOTE-19` |
| Small text + Callout = `data-variant` trên paragraph, không thêm node mới | Ít đụng schema / Card Clipper / mã khối; đủ parity | `12`, `lib/note-paragraph-variant.ts` |
| Lock Position: thêm trường `locked` trong NoteData; chặn kéo + resize, vẫn sửa / đổi màu được; kéo cụm thì note khoá đứng yên | Giống Milanote Lock Position (khoá vị trí, không khoá nội dung) | `12` `INV-NOTE-18` |
| Convert to Document hiện nút nhưng vô hiệu (mờ); Labels / Reactions / Comment cũng vô hiệu (Labels tách spec sau, Reactions / Comment cần đăng nhập) | Hiện đủ menu như Milanote nhưng chưa làm được thì để mờ, rõ hơn nút chết | `12` toolbar |
| Gộp undo kéo góc note tự-cao thành 1 bước (`commitResize` nhận `extra`); min 68 chiều cao cả 2 mode (`minSize` trong định nghĩa loại) | Ctrl+Z 1 lần trả cả cỡ lẫn mode; note cố định không dẹt hơn note tự-cao. Giải quyết 2 câu còn mở của `12` | `12` `INV-NOTE-06`. Giải quyết câu mở 2026-10-13 |
| Chấm QuickLine + góc resize to nhỏ theo zoom nhưng kẹp cỡ trên màn: chấm 8–16px, góc 14–26px, áp cả hai (ĐÃ LÀM, bạn chốt) | Zoom nhỏ góc resize teo còn vài px không bấm được, zoom to thì phình. Ở zoom 1 chấm 12, góc 20 (tăng từ 16, bạn báo nhỏ) | `10` Viền chọn. Bổ sung dòng "to nhỏ theo zoom" 2026-10-13 |
| Chấm QuickLine nhận chuột: hover to 1.75 + hiện mũi tên chéo trong chấm (1.1 khó nhận ra), con trỏ giữ con trỏ thường (bỏ `crosshair`), bấm không lọt xuống card; góc resize không hover (ĐÃ LÀM, bạn chốt) | Chấm là điểm kéo ra mũi tên nối sau này, giờ dựng sẵn phản hồi + chặn chuột | `10` Viền chọn, `02` Con trỏ |
| Undo theo từng board (đã làm): lệnh vào stack board đang xem lúc làm, kể cả lệnh đổi dữ liệu board khác; giữ 100 bước mỗi board; board bị xoá vẫn giữ stack; F5 mất | Kiro tự chọn theo hướng đã chốt 2026-10-13, giống Milanote (undo theo chỗ đang đứng). Đổi được nếu bạn muốn khác | `10` mục Undo / redo, `INV-CANVAS-20` |

## 2026-10-13

| Quyết | Vì sao | Thay / ghi ở |
|---|---|---|
| Sơ đồ kiến trúc: server giả và Supabase là 1 khối "Server" (giả ở dev → Supabase) | Server giả đứng thay Supabase, cùng dạng gói; `canvas-sync` chỉ đổi đích | `docs/architecture-diagram/` |
| Undo sau khi đổi board: giải quyết triệt để (ĐÃ LÀM 2026-10-14): lịch sử undo riêng từng board + lệnh undo / redo chỉ đưa vào store object thuộc board đang xem | Không mất undo khi quay lại board, không hiện nhầm object board khác | `10` Câu còn mở, handoff |
| Kéo nhiều object: preview vẽ cả cụm, không ẩn object khác; board tile cộng đúng số object đang kéo (ĐÃ LÀM 2026-10-14, bạn báo) | Object chưa thả vẫn thuộc board này nên phải thấy; số +1 sai khi kéo nhiều | `10` `INV-CANVAS-21` |
| Unsort chỗ chèn + vạch chèn đo vị trí thật từng item, bỏ bước cố định 148px (ĐÃ LÀM 2026-10-14; thử MCP thấy lệch thật: vạch nằm dưới item cuối khi con trỏ ở giữa item ngắn) | Item cao 60–140 không đều, bước cố định lệch | `10` mục Unsort |
| Fit, giới hạn pan, zoom tối thiểu, kéo ra mép bỏ item Unsort; số "N mục" ở header vẫn đếm cả Unsort (đã làm) | Item Unsort không vẽ trên canvas; số ở header là tổng của board | `10` `INV-CANVAS-18` |
| Giới hạn pan = ô cuộn trên "tài liệu" kiểu Milanote: gốc (hoặc object − 50 nếu âm) tới object xa nhất + 500 / + 400, nhân zoom; nhỏ hơn màn thì khoá. Giữ camera tự vẽ, không chuyển sang thanh cuộn thật (bạn chọn A 2026-10-15, theo số đo MCP). Zoom in ở chỗ trống hút về object gần chuột nhất, camera đi thẳng tới đích đã chặn (ĐÃ LÀM 2026-10-15, bạn test OK) | Bản cũ cho kéo tới màn trống, zoom ở chỗ trống rồi kéo thì giật; giống Milanote | `10` mục camera |
| Delete vùng chọn có board tile + object khác: xoá hết, dialog đếm cả 2, 1 bước undo (đã làm) | Xoá đúng cái người dùng chọn | `10` |
| Nhân bản / dán board tile = nhân bản cả board (chưa làm, cần spec) | 2 tile trỏ 1 board làm xoá / đếm rối; giống Milanote | `canvas-backlog.md` |
| Token màu trong Tailwind bọc `color-mix` + `<alpha-value>` để `/15`, `/40` chạy (đã làm) | Sửa 1 chỗ cho mọi class độ mờ, đúng như `coding-style.md` dạy | `02` `INV-UI-13` |
| Nút màu note đọc qua `parseNoteData` (đã làm) | Bịt đường duy nhất làm mất chữ khi dữ liệu lạ | `12` |
| Card Clipper chỉ hiện lúc sửa note, theo khối đang gõ; hover to lên + mũi tên; kéo không thoát sửa (ĐÃ LÀM 2026-10-14, bạn chốt) | Giống Milanote | `12` Card Clipper |
| Header canvas có thêm kiểu "Đảo nổi" (mockup 04b), chọn trong Cài đặt → Canvas, mặc định giữ "2 hàng". Canvas tràn màn, 2 đảo: trái = breadcrumb (tên board là mắt xích cuối, double-click đổi tên) + chấm trạng thái lưu, phải = bộ nút cũ + Chia sẻ / Xuất / % zoom. Bỏ đảo giữa (3B): đảo giữa ngắn lọt thỏm, tên board vốn là mắt xích cuối đường dẫn (ĐÃ LÀM 2026-10-14, bạn chốt 1B 2A 3B) | So sánh 2 kiểu trên cùng dữ liệu trước khi bỏ kiểu nào. Giữ kiểu nào, bỏ kiểu nào: CHƯA CHỐT (bạn nhắc 2026-10-15), chỉ các ý nhỏ 1B 2A 3B là đã chốt | `10` Header, `05` Canvas, spec `canvas-header-islands` |
| Trạng thái lưu kiểu đảo = 1 chấm luôn hiện: xanh đứng yên (đã lưu), vàng chớp nhẹ (đang lưu / chờ đồng bộ), đỏ (lỗi), tooltip chữ đầy đủ. Sửa tên board: click ra canvas cũng lưu được; ô = đúng bề rộng chữ lúc xem (đo DOM lúc double-click) nên chuyển xem ↔ sửa không nhảy rộng, gõ dài hơn chữ cuộn trong ô, KHÔNG giãn (ĐÃ LÀM 2026-10-14, bạn chốt) | Chữ trạng thái cũ nhấp nháy nhanh, dài, kéo layout; bấm ra canvas không blur input nên không lưu | `10` Header |
| Thả Card Clipper xong thì vào sửa note mới (cả cắt lẫn chép), chỉ note mới được chọn (ĐÃ LÀM 2026-10-14, bạn chốt) | Gõ tiếp ngay vào đoạn vừa tách; thay bản giữ sửa note gốc | `12` Card Clipper |
| Chấm QuickLine + góc resize to nhỏ theo zoom (ĐÃ LÀM 2026-10-14, bạn chốt) | Giống Milanote | `10` Viền chọn |
| Note không có thanh màu mặc định (chỉ hiện khi chọn màu); bỏ viền thử từng đoạn `p`; viền chọn + chấm tròn mặc định trắng đen theo theme, đổi được trong Cài đặt → Canvas (ĐÃ LÀM 2026-10-14, bạn chốt) | Thanh xanh và viền đoạn hiện ra do sửa token độ mờ 10-13, bạn không muốn | `10` Viền chọn, `12`, `05` |
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
