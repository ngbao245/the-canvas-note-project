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

## Trạng thái hiện tại

- App chưa scaffold. Chưa `git init`. Chưa copy source từ donor.
- Spec đã duyệt: `.kiro/specs/bibo-foundation/` — sẵn sàng Builder Task 1.
- Template spec: `.kiro/specs/_TEMPLATE/` — copy khi tạo spec mới.

## Rule cứng workspace

- **Chỉ ghi vào `d:\develop\Side\bibo-hub\bibo\`**. Cấm ghi sang `../bibo-hub/`.
- Copy code từ donor phải note file nguồn trong commit hoặc task log.
- Tiếng Việt có dấu ở mọi output (chat, doc, code comment, commit).
- Không emoji.
- Không jargon (xem cấm list trong `core.md`).
