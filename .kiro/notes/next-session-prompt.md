# Prompt mở session mới — `bibo-auth`

Dán nguyên khối dưới vào session mới. File này là nguồn chuẩn cho bước chuyển session; làm xong việc thì thay bằng prompt của việc kế.

---

Làm tiếp `bibo-auth` (đăng nhập SSO), bước chặn trước `canvas-sync`. Workspace thật: `d:\develop\Side\bibo-hub\bibo\`. Folder `bibo-hub\bibo-hub\` là donor chỉ đọc, steering của nó mô tả trạng thái CŨ, bỏ qua khi mâu thuẫn. `bibo-auth` là project riêng ngoài `bibo\`, spec để ở `bibo\.kiro\specs\bibo-auth\`.

**Bước 0 — đọc trước, theo thứ tự, rồi báo 1 dòng "Đọc ... để làm ...":**

1. `.kiro/steering/core.md`.
2. `docs/supabase-setup.md` (khoá ký JWT chung, tắt đăng ký ở project phụ, bước 6 kiểm token chéo chưa thử).
3. `.kiro/specs/bibo-auth/` (3 file, đang Nháp, viết 2026-09-28 trước khi chốt khoá ký chung).
4. `.kiro/notes/milanote-sync-architecture.md` mục 2.8 (phần "ĐÃ CHỐT 2026-10-13").
5. `.kiro/steering/mode-planner.md`.

**Bước 1 — hỏi cho rõ (tối đa 3 câu MCQ / lượt), chỉ những gì CHƯA chốt:**

- Bạn đã dựng project theo `docs/supabase-setup.md` tới bước nào.
- `bibo-auth` dùng project auth cũ của donor (`fghrcpfxgdfibascmase`) hay project auth mới. Spec ghi "dùng chung project cũ", viết trước khi chốt khoá ký chung.
- Phạm vi phase 1: spec có 10 user story; bản tối thiểu để mở khoá `canvas-sync` là gì (đăng nhập + token + refresh?).
- Folder `bibo-auth` đặt ở đâu trên máy (ngoài `bibo\`), quy tắc ghi file.

**Đã chốt, không hỏi lại:**

- Backend Supabase, auth qua `bibo-auth`, project dữ liệu MỚI riêng cho bibo.
- Mọi project nhập chung 1 khoá ký JWT (ES256) để tin token của project auth.
- Chia project: board ở 1 project chính, chỉ file chia nhiều project, chuẩn bị sẵn để sau gán mỗi người vào 1 project.
- Job chống tạm dừng project Free: ĐỂ SAU, không làm trong `bibo-auth`. Hướng nghiêng ghi ở `docs/supabase-setup.md`.
- Không để `service_role_key` trên trình duyệt.
- Thứ tự: `bibo-auth` → `canvas-sync` → `canvas-sharing`.

**Việc treo phải nhớ khi viết `canvas-sync`:**

- Cột chủ sở hữu mọi dòng, bảng "board → project" từ đầu, client Supabase lấy theo board.
- Không khoá ngoại tới `auth.users` ở project dữ liệu (người dùng nằm ở project auth).
- Cài `@supabase/supabase-js` ghim version chính xác (lần kiểm 2026-10-13: 2.117.3).
- Gỡ nhãn tạm `OfflineBadge`, chốt "xử lý ngầm" có mâu thuẫn header 3 trạng thái không.
- `lib/idb.ts` xử `onblocked` khi nâng phiên bản database.

**Luật cứng:**

- Tiếng Việt có dấu, không emoji, gọi "bạn", xưng "Kiro". Không dùng từ khó trong cấm list của `core.md`.
- Chỉ ghi vào `bibo\` (trừ khi bạn chốt chỗ cho `bibo-auth`). Không commit, không push.
- Lệnh có output dài: `... 2>&1 | Select-Object -Last 15`. Ghi JSON bằng Node `fs`.
- Quyết định mới chốt trong chat phải ghi vào spec / handoff / note ngay trong lượt đó.
