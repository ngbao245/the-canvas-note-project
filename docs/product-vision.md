# Tầm nhìn sản phẩm — bibo

Tài liệu này cho agent (Kiro) và người mới nắm được bibo là gì, giải quyết vấn đề gì, và các khái niệm cốt lõi. Đọc file này trước khi làm tính năng lớn, để không hiểu sai ý đồ sản phẩm.

Rule cứng và convention code nằm ở `.kiro/steering/core.md`, `docs/architecture.md`, `docs/conventions.md`. File này chỉ nói về "tại sao" và "cái gì", không nói "code thế nào".

## Tên

- Codename hiện tại: **bibo** (tên tạm, dùng trong repo, folder, commit).
- Tên đang cân nhắc: **BiBaNote**. Chưa chốt cứng.
- Khi đổi tên thật: đổi ở tài liệu, tiêu đề UI, metadata. Không vội đổi tên folder/repo cho tới khi chốt.

## Một câu

bibo là không gian làm việc trực quan đa năng: gom nguồn, ghi chú, và sắp xếp mọi thứ trên một canvas kéo thả, với AI hỗ trợ phân tích và mọi dữ liệu đều truy được về nguồn gốc.

## Vấn đề giải quyết

Khi làm việc với nhiều tài liệu và ý tưởng, thông tin bị phân mảnh: PDF ở một nơi, ghi chú ở nơi khác, kết luận không truy lại được nguồn. Công cụ hiện có hoặc quá cứng (bảng tính, tài liệu tuyến tính), hoặc trực quan nhưng không gắn được dữ liệu với nguồn gốc.

bibo gom ba thứ vào một chỗ:
1. Nguồn (source): PDF, ảnh, web clip — kho tài liệu gốc.
2. Ghi chú và object: nội dung do người dùng tạo hoặc AI trích xuất.
3. Canvas: mặt phẳng trực quan để sắp xếp, nối, và nhìn tổng thể mối quan hệ.

Điểm giữ cho bibo đáng tin: mọi object trên canvas đều truy được về nguồn gốc (provenance) — object này lấy từ file nào, trang nào, bảng nào.

## Người dùng và lộ trình

Sản phẩm đi theo 3 nấc, thiết kế phải tính trước để không phải viết lại:

1. Nay — một người dùng (chính bạn). Tự dùng, dữ liệu cá nhân. Ưu tiên: chạy được, đủ tính năng cốt lõi.
2. Kế tiếp — nhiều người dùng, mỗi người một tài khoản riêng. Cần auth, phân tách dữ liệu theo người dùng.
3. Xa hơn — nhiều người dùng chung một workspace (cộng tác). Cần phân quyền, và về lâu dài là realtime/đồng bộ.

Hệ quả cho quyết định kỹ thuật: khi chọn backend/data model, ưu tiên phương án không khoá cứng vào một-người-dùng, để nâng cấp lên nhiều người và cộng tác về sau đỡ phải đập đi làm lại. Chi tiết backend chưa chốt (xem `.kiro/steering/core.md`).

## Điều làm bibo khác biệt

Theo thứ tự ưu tiên:

1. Provenance (truy nguồn) — điểm mạnh nhất. Mọi số liệu, bảng, kết luận đều gắn với nguồn gốc: file nào, trang nào. Người dùng bấm một cái là mở đúng đoạn nguồn. Không có dữ liệu "trôi nổi" không rõ từ đâu ra.
2. Canvas trực quan gắn AI — kéo thả object lên mặt phẳng, AI hỗ trợ nối quan hệ và phân tích (so sánh, trích bảng, phát hiện biến động). Trực quan như Milanote nhưng có trí tuệ bên dưới.
3. Kiến trúc plugin (ý tưởng tương lai) — hình dung lõi mỏng, năng lực cắm thêm bằng plugin theo từng workspace. Hiện chưa phải điểm bán, chưa xây. Ghi lại để định hướng kiến trúc không đóng cửa với plugin sau này.

## Khái niệm cốt lõi

Các danh từ này dùng nhất quán trong toàn dự án (UI, code, tài liệu):

| Khái niệm | Nghĩa |
|---|---|
| Workspace | Không gian làm việc lớn nhất. Chứa nhiều canvas, note, source. Sau này là đơn vị để chia sẻ và phân quyền. |
| Canvas | Mặt phẳng trực quan vô hạn, kéo thả object lên, nối bằng connector. Nơi làm việc chính. |
| Object | Một đơn vị nội dung trên canvas: note, link, to-do, board, table, image, file, line. Mỗi object có loại và có thể có provenance. |
| Connector | Đường nối giữa hai object, thể hiện quan hệ (ví dụ "trích từ", "so sánh", "chứng minh cho"). |
| Provenance | Nguồn gốc của một object: file nào, trang nào, bảng nào. Cho phép mở đúng đoạn nguồn. |
| Source | Tài liệu gốc trong kho: PDF, ảnh, web clip. Object thường bắt nguồn từ source. |
| Note | Ghi chú do người dùng viết. |
| Inspector | Panel chi tiết một object đang chọn: provenance, độ tin cậy, quan hệ. |
| Unsort | Khu chứa object mới import chưa xếp lên canvas. Kéo từ đây ra board để dùng. |
| Board (object) | Một loại object dạng nhóm: canvas lồng trong canvas. |
| Plugin (tương lai) | Năng lực cắm thêm theo workspace. Chưa xây. |

## Bản đồ mockup

13 trang mockup HTML tại `mockups/` là nguồn tham chiếu trực quan cho ý đồ thiết kế. Xương sống đã làm kỹ:

- `04-canvas.html` — canvas chính, kiểu Milanote lai. Rail workspace + component palette + board + inspector/unsort. Đây là màn hình trung tâm của sản phẩm. Kịch bản minh hoạ trong mockup là phân tích báo cáo tài chính (so sánh hai kỳ, phát hiện biến động), nhưng đó chỉ là một ví dụ dùng-để — canvas là đa năng, không giới hạn ở tài chính.
- `05-plugin-store.html` — hình dung store plugin (ý tưởng tương lai). Data-driven, có search/filter/install/detail.

Các trang còn lại (landing, app home, workspace manager, plugin detail, notes, sources, command palette, settings, onboarding, inspector) là phác thảo flow, mức độ hoàn thiện thấp hơn hai trang trên.

Lưu ý cho agent: mockup thể hiện "cái gì" và "trông thế nào". Khi mockup và tài liệu này lệch nhau về ý đồ, tài liệu này (đã xác nhận với người dùng) là nguồn ưu tiên.

## Trạng thái hiện tại

- Foundation React đã scaffold xong (Vite + React + Router + Tailwind + shadcn primitives). Build và lint pass.
- **Design system đã thống nhất và ship** (spec `design-system` Task 1-8): primary xanh #007acc, Plus Jakarta Sans, token theo `[data-theme]` (dark + light), 2 trục theme + phong cách vẽ tay/phẳng. Xem `.kiro/notes/design-system.md`.
- **Canvas Phase A đã ship** (spec `canvas` Task 1-12): route `/canvas`, camera engine (pan/zoom-at-cursor mượt, dynamic zoom min content-aware), object CRUD rect, select/marquee/resize, undo/redo, Fit/Reset view, grid dot LOD. Persist IndexedDB.
- Các tool khác trong `src/tools/` chưa làm. Object types (Note/Text/Image/Link) là Canvas Phase B tiếp theo.
- Mockup HTML đã dựng đủ để hình dung. Canvas và plugin store làm kỹ nhất.
- Backend, auth, deploy: chưa quyết.

## KHÔNG suy diễn ngoài tài liệu này

Nếu cần quyết định sản phẩm chưa ghi ở đây (ví dụ tính năng cộng tác realtime hoạt động ra sao, plugin đóng gói kiểu gì), hỏi người dùng thay vì tự đoán. Tài liệu này cập nhật khi ý đồ sản phẩm thay đổi.
