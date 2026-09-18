# Skill — khi nào dùng cái nào

Bộ skill port từ Codex. Kiro chỉ load khi bạn gọi tên (`$kiro-xxx`) hoặc khi câu hỏi khớp trigger phrase trong skill đó.

## Bảng tra nhanh

| Skill | Dùng khi | Trigger |
|---|---|---|
| `surgical-coding` | Bug fix / refactor / edit code có scope rõ, cần đọc trước khi sửa | Tự match khi bạn nói bug/refactor/edit |
| `simplify` | Dọn code vừa sửa: gộp trùng, giảm indirection, giữ behavior | `$kiro-simplify` hoặc bạn nói "simplify/clean up/dọn code" |
| `data-debug` | Inspect DB (Postgres/MySQL/Mongo/Redis/MSSQL/Oracle) qua Docker. Read-only mặc định | `$kiro-data-debug` |
| `technical-diagrams` | Vẽ sơ đồ kiến trúc/workflow/sequence/state thành HTML tương tác | `$kiro-technical-diagrams` |
| `interact-with-git-platform` | Thao tác GitHub/GitLab/Gitea qua CLI (`gh`/`glab`/`tea`): PR, issue, review, CI | Bạn nói task đụng platform, không phải git local |
| `update-agent-docs` | Refresh/tạo lại `.kiro/steering/*.md` khi doc lệch code | `$kiro-update-agent-docs` |

## Bộ 3 workflow dài (Codex-style)

Dành cho task phức tạp nhiều phase, cần persistent Markdown bundle qua nhiều session.

| Skill | Dùng khi | Trigger |
|---|---|---|
| `discuss` | Bàn ý tưởng, ghi lại kết luận vào bundle Markdown. Chưa code | `$discuss` |
| `plan` | Chốt kế hoạch: tạo bundle plan có phase, chờ duyệt | `$plan` |
| `execute` | Chạy plan đã duyệt, track evidence từng phase | `$execute` |

Lưu ý: bibo đã có `mode-planner` / `mode-builder` / `mode-fix` riêng gọn hơn. **Dùng bộ 3 này chỉ khi task rất lớn nhiều session** — feature nhỏ vẫn dùng mode bibo.

## Ghi chú

- Bibo có `mode-planner.md` + `mode-builder.md` + `mode-fix.md` là mode LÕI, load qua tín hiệu (không cần trigger `$`). Skill là lớp bổ sung, gọi rõ tên khi cần.
- Task đơn giản: chỉ mode bibo là đủ.
- Task cần công cụ đặc biệt (vẽ diagram, inspect DB, thao tác platform Git): thêm skill tương ứng.
