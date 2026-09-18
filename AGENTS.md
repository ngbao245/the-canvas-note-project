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

**Handoff theo tool** (Kiro tự đọc khi làm tool đó):
- Canvas → `.kiro/notes/canvas-session-handoff.md` + `.kiro/notes/canvas-backlog.md`

**Skill** (Kiro chỉ load khi được gọi tên hoặc khớp trigger):
- Đặt trong `.kiro/skills/{tên-skill}/SKILL.md`. Hiện chưa có skill nào.

## Trạng thái hiện tại

Cập nhật 2026-09-18.

- App scaffold đủ. `npm run build` pass, `npm run lint` 0 error (5 warning cũ, không blocking).
- Đã `git init`, chưa commit lần nào.
- Tool đang làm: Canvas (`src/tools/canvas/`). Refactor B2 đã xong (4 nhóm: util reuse, gom UI trùng, tách file, tách camera-engine helper). Trạng thái đầy đủ ở `.kiro/notes/canvas-session-handoff.md`.
- Spec: `bibo-foundation` (xong), `canvas`, `canvas-content-objects`, `design-system`. Template: `.kiro/specs/_TEMPLATE/`.

## Lưu ý workspace đa gốc

Workspace đang mở 2 folder: `bibo` (thật) và `bibo-hub` (donor cũ). Steering của `bibo-hub` cũng bị nạp vào context mỗi session và mô tả trạng thái CŨ của donor, không áp dụng cho `bibo`. Khi rule 2 folder mâu thuẫn, rule của `bibo` (file này + `core.md`) là chuẩn. Muốn hết nhiễu: đóng folder `bibo-hub` khỏi workspace, chỉ giữ `bibo`.

## Rule cứng workspace

- **Chỉ ghi vào `d:\develop\Side\bibo-hub\bibo\`**. Cấm ghi sang `../bibo-hub/`.
- Copy code từ donor phải note file nguồn trong commit hoặc task log.
- Tiếng Việt có dấu ở mọi output (chat, doc, code comment, commit).
- Không emoji.
- Không jargon (xem cấm list trong `core.md`).
