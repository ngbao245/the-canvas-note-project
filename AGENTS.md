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
- Canvas → `.kiro/notes/canvas-session-handoff.md` (trạng thái tổng + rule cứng) + `.kiro/notes/canvas-backlog.md` (feature chưa làm)
- Lưu / đồng bộ / backend → `.kiro/notes/milanote-sync-architecture.md` (nguồn chuẩn hướng outbox, khoá, Supabase) + sơ đồ `docs/sync-diagrams/`

**Skill** (Kiro chỉ load khi được gọi tên hoặc khớp trigger):
- Đặt trong `.kiro/skills/{tên-skill}/SKILL.md`. Hiện chưa có skill nào.

## Trạng thái hiện tại

Cập nhật 2026-10-12.

- App scaffold đủ. `npm run build` pass, `npm run lint` 0 error (1 warning shadcn có chủ ý, không cần sửa).
- Đã `git init`, chưa commit lần nào.
- Tool đang làm: Canvas (`src/tools/canvas/`). Trạng thái đầy đủ + việc còn mở ở `.kiro/notes/canvas-session-handoff.md` (mục cuối).
- Spec xong: `bibo-foundation`, `canvas`, `canvas-nested-boards`, `canvas-unsort`, `canvas-landing-demo`, `shortcuts`, `canvas-note-autosave`, `canvas-storage-v2`.
- `app-offline` xong 2026-10-12 (service worker `vite-plugin-pwa`, chỉ bản build app), bạn test tay pass. Thử offline: `npm run build` + `npm run preview` (dev không có service worker).
- Việc tiếp theo: sửa `bibo-foundation` thêm Supabase (handoff "Việc còn mở" mục 3). Session mới: dán `.kiro/notes/next-session-prompt.md`.
- Spec còn task mở: `canvas-content-objects` (Image + Link, Task 5-9), `canvas-unsort-multi-select` (Task 5-7), `i18n` (Task 5-7), `settings` (Task 11 đang khoan), `shortcuts-modal` (1 mục), `design-system` (Task 9 hoãn).
- `bibo-auth` là project riêng ngoài `bibo/`, spec để ở đây. Template: `.kiro/specs/_TEMPLATE/`.
- Landing là bản build riêng (`landing.html` + `vite.landing.config.ts`, domain riêng với app). Canvas mini thử ở `src/routes/landing/demo/`, độc lập với canvas thật (cấm import `src/tools/canvas/`).

## Lưu ý workspace đa gốc

Workspace đang mở 2 folder: `bibo` (thật) và `bibo-hub` (donor cũ). Steering của `bibo-hub` cũng bị nạp vào context mỗi session và mô tả trạng thái CŨ của donor, không áp dụng cho `bibo`. Khi rule 2 folder mâu thuẫn, rule của `bibo` (file này + `core.md`) là chuẩn. Muốn hết nhiễu: đóng folder `bibo-hub` khỏi workspace, chỉ giữ `bibo`.

## Rule cứng workspace

- **Chỉ ghi vào `d:\develop\Side\bibo-hub\bibo\`**, ngoại lệ `D:\develop\Side\bibo-hub\bibo-auth\` (bạn cho quyền 2026-10-13, cùng rule). Cấm ghi sang `../bibo-hub/`.
- Copy code từ donor phải note file nguồn trong commit hoặc task log.
- Tiếng Việt có dấu ở mọi output (chat, doc, code comment, commit).
- Không emoji.
- Không jargon (xem cấm list trong `core.md`).
