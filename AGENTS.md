# AGENTS.md — bibo workspace

Workspace mới. Sibling `../bibo-hub/` là **donor, chỉ đọc** — cấm ghi, chỉ tham chiếu khi cần copy pattern/source có chủ đích.

## Đọc trước khi làm

Steering setup dựa trên [`Theadd/kiro-agents`](https://github.com/Theadd/kiro-agents) (lazy loading pattern) và [`Austin1serb/agents-md`](https://github.com/Austin1serb/agents-md) (byte-cap output), overlay tiếng Việt.

**Load mỗi lượt** (~1KB):
- `.kiro/steering/core.md` — nguyên tắc lõi (identity, stack, git, byte-cap, mode pointer)

**Load theo tình huống** (bấm tay hoặc Kiro chủ động khi match):
- `.kiro/steering/mode-planner.md` — khi có tool/tính năng lớn mới
- `.kiro/steering/mode-builder.md` — khi có `tasks.md` đã duyệt, bắt đầu code
- `.kiro/steering/mode-fix.md` — khi báo bug hoặc sửa nhỏ

**Load theo fileMatch** (Kiro tự đọc khi đọc file khớp pattern):
- `.kiro/steering/coding-style.md` — chi tiết rule TS/theme/folder/comment. Match `src/**/*.{ts,tsx}`.
- `.kiro/steering/shortcuts.md` — chi tiết khai báo phím tắt. Match `src/lib/shortcuts/**` và file tên có "shortcut". Sửa phím ở component thường thì Kiro phải chủ động đọc.

**Handoff theo tool** (Kiro tự đọc khi làm tool đó):
- Canvas → `.kiro/notes/canvas-session-handoff.md` (việc đang dở, chờ test, câu chờ chốt; bản cũ đầy đủ ở `docs/legacy/`) + `.kiro/notes/canvas-backlog.md` (feature chưa làm)
- Lưu / đồng bộ / backend → `.kiro/notes/milanote-sync-architecture.md` (nguồn chuẩn hướng outbox, khoá, Supabase) + sơ đồ `docs/sync-diagrams/`

**Doc hệ thống** `docs/system/` (nguồn chuẩn mô tả app theo code, đủ 13 phần 2026-10-13):
- `00-map.md` — bạn nhắc chủ đề nào thì đọc file nào + danh sách mọi `INV-*`. Tra bảng này trước, không đọc tràn.
- `01-core` (stack, build, folder, import) · `02-ui-common` (theme, z, con trỏ, shared) · `03-i18n` · `04-shortcuts` · `05-settings`.
- `10-canvas-core` (board, camera, chọn, kéo, undo, Unsort, dán) · `11-object-types` · `12-note`.
- `20-local-data` (IndexedDB, hàng đợi ghi, khoá giữa tab) · `21-server-sync` (outbox) · `30-landing`.
- `decisions.md` — sổ quyết định đã chốt + lý do. Câu đã ở đây không hỏi lại.
- Đổi hành vi → sửa doc phần đó trong cùng task. Doc cũ đã thay: `docs/legacy/` (không cập nhật, không dùng làm luật).

**Skill** (Kiro chỉ load khi được gọi tên hoặc khớp trigger):
- Đặt trong `.kiro/skills/{tên-skill}/SKILL.md`. Hiện chưa có skill nào.

## Trạng thái hiện tại

Cập nhật 2026-10-13.

- App scaffold đủ. `npm run build` pass, `npm run lint` 0 error (1 warning shadcn có chủ ý, không cần sửa). `npm run test` (vitest 4.1.10) pass.
- Đã `git init`, chưa commit lần nào.
- Tool đang làm: Canvas (`src/tools/canvas/`). Kiến trúc ở `docs/system/`, việc còn mở ở `.kiro/notes/canvas-session-handoff.md`.
- Spec đã ship đều nằm ở `docs/legacy/specs/` (chỉ là lịch sử). `.kiro/specs/` chỉ còn spec đang dùng: `canvas-content-objects`, `canvas-unsort-multi-select`, `i18n`, `canvas-outbox` (chờ test O2 + O5), `canvas-note-block-keys` (chờ test N1–N4).
- Thử offline: `npm run preview:offline` (dev không có service worker).
- Bộ doc hệ thống xong 2026-10-13. Còn: bạn chốt các câu mở (tổng hợp ở handoff mục "Câu chờ bạn chốt trong doc"), vẽ lại sơ đồ kiến trúc. Việc kế: đăng nhập trong app (Supabase Auth) → `canvas-sync`. Session mới: dán `.kiro/notes/next-session-prompt.md`.
- Tính năng chưa làm: `.kiro/notes/canvas-backlog.md` (canvas), `.kiro/notes/backlog.md` (ngoài canvas).
- Đăng nhập nằm trong app (Supabase Auth), không còn service SSO `bibo-auth` riêng (bạn chốt 2026-10-13). Spec `bibo-auth` cũ đã chuyển vào `docs/legacy/specs/bibo-auth/`, chỉ tham khảo. Template: `.kiro/specs/_TEMPLATE/`.
- Landing là bản build riêng (`landing.html` + `vite.landing.config.ts`, domain riêng với app). Canvas mini thử ở `src/routes/landing/demo/`, độc lập với canvas thật (cấm import `src/tools/canvas/`).

## Lưu ý workspace đa gốc

Workspace đang mở 2 folder: `bibo` (thật) và `bibo-hub` (donor cũ). Steering của `bibo-hub` cũng bị nạp vào context mỗi session và mô tả trạng thái CŨ của donor, không áp dụng cho `bibo`. Khi rule 2 folder mâu thuẫn, rule của `bibo` (file này + `core.md`) là chuẩn. Muốn hết nhiễu: đóng folder `bibo-hub` khỏi workspace, chỉ giữ `bibo`.

## Rule cứng workspace

- **Chỉ ghi vào `d:\develop\Side\bibo-hub\bibo\`**, ngoại lệ `D:\develop\Side\bibo-hub\bibo-auth\` (bạn cho quyền 2026-10-13, cùng rule). Cấm ghi sang `../bibo-hub/`.
- Copy code từ donor phải note file nguồn trong commit hoặc task log.
- Tiếng Việt có dấu ở mọi output (chat, doc, code comment, commit).
- Không emoji.
- Không jargon (xem cấm list trong `core.md`).
