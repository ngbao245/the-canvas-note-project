# Prompt mở session mới — undo theo board, Unsort, rồi các câu chờ chốt

Dán nguyên khối dưới vào session mới. Làm xong việc thì thay bằng prompt của việc kế.

---

Làm tiếp bibo. Workspace thật: `d:\develop\Side\bibo-hub\bibo\`. Folder `bibo-hub\bibo-hub\` là donor chỉ đọc, bỏ qua khi mâu thuẫn. Bộ doc hệ thống `docs/system/` đủ 13 phần (2026-10-13), là nguồn chuẩn.

**Bước 0 — đọc trước, rồi báo 1 dòng "Đọc ... để làm ...":**

1. `.kiro/steering/core.md`, `.kiro/steering/mode-fix.md` (việc 1, 2 là sửa lỗi đã chốt hướng).
2. `docs/system/00-map.md`, `docs/system/decisions.md` (đã chốt, không hỏi lại).
3. `docs/system/10-canvas-core.md` mục "Undo / redo", "Unsort", "Câu còn mở"; `docs/system/20-local-data.md` mục "Luồng theo board".
4. `.kiro/notes/canvas-session-handoff.md`.

**Việc 1 — Undo theo từng board, làm triệt để (bạn chốt 2026-10-13).**

Lỗi: `store/history-store.ts` có 1 lịch sử chung, đổi board không xoá. Đang ở board B bấm Ctrl+Z bước làm ở board A → lệnh undo gọi `useObjectsStore.add` không kiểm board → object của A hiện nhầm trên B (và redo / ghi máy theo đó). Kiro mới đọc code, chưa thử tay: thử MCP để xác nhận trước khi sửa.

Hướng đã chốt (2 lớp, làm cả 2):
- Lịch sử riêng từng board: `history-store` giữ `undo / redo` theo `boardId` (Map), đổi board (`current-board-store` / `useBoardSync`) thì chuyển sang stack của board đó; quay lại board cũ vẫn undo được. Nút Undo / Redo ở header đọc stack board đang xem. Giữ `beginHistoryGroup` / `endHistoryGroup` (vừa thêm, dùng cho xoá vùng chọn lẫn board) chạy đúng với stack mới.
- Lệnh undo / redo trong `engine/actions.ts` chỉ đưa vào store object có `boardId` = board đang xem; dữ liệu vẫn ghi xuống máy đúng. Đây là lớp chặn thứ 2 cho lệnh đụng nhiều board: xoá cây board (`deleteBoardCascade`), chuyển vào Unsort board khác (`moveObjectsToUnsort`), thả lên board tile, đổi cha board.
- Cần quyết (hỏi bạn nếu không rõ, MCQ ≤ 3 câu): bước làm ở board A nhưng đổi dữ liệu board B (VD thả object vào tile B) thuộc stack nào; giới hạn tổng số bước (hiện 100 / stack); xoá stack khi board bị xoá.
- Test: thêm test vitest thuần cho `history-store` (stack theo board, gom nhóm). Thử tay qua MCP: tạo note ở A → vào B → Ctrl+Z không làm gì sai trên B → về A → Ctrl+Z xoá note.
- Xong: sửa `10` (mục Undo / redo, thêm `INV-CANVAS-xx` cho luật mới, xoá câu mở), `decisions.md` (đổi dòng thành "đã làm"), handoff.

**Việc 2 — Unsort vạch chèn (bạn chốt A).** `useUnsortDrag.ts` dùng `ITEM_HEIGHT = 148` + `LIST_OFFSET_TOP = 88`, `UnsortPanel.tsx` dùng `ITEM_STRIDE = 148`, còn item thật cao 60–140 (`UnsortItem.tsx`). Thử MCP: khay chờ có 3–4 note ngắn, kéo item đổi chỗ, xem vạch chèn + vị trí thả có đúng không. Lệch thật thì đổi sang đo vị trí thật từng item (`getBoundingClientRect`), bỏ hằng số; không lệch thì ghi vào `10` là đã kiểm.

**Việc 3 — các câu chờ chốt còn lại** ở handoff mục "Câu chờ bạn chốt trong doc" (lỗi thật trước: Card Clipper lúc đang sửa note — thử MCP trước). Mỗi lượt ≤ 3 câu MCQ.

**Việc 4 (khi bạn bảo):** đăng nhập trong app (Supabase Auth) → `canvas-sync`. Sơ đồ kiến trúc đã vẽ lại 2026-10-13; đổi kiến trúc thì sửa `bibo.architecture.json` rồi `deliver` lại.

**Chờ bạn test tay:** D1–D3 xoá lẫn board, O2 + O5, N1–N4 (handoff).

**MCP:** lần trước Chrome DevTools MCP báo "browser is already running" (profile `C:\Users\baonh3\.cache\chrome-devtools-mcp\chrome-profile` bị giữ). Nếu gặp lại: nhờ bạn đóng cửa sổ Chrome của MCP, hoặc tắt tiến trình chrome dùng profile đó (hỏi bạn trước khi tắt). Dev server: `npm run dev` cổng 3000 (có thể đang chạy sẵn).

**Luật cứng:** tiếng Việt có dấu, không emoji, "bạn" / "Kiro", không từ khó trong `core.md`. Tên file tiếng Anh. Chỉ ghi vào `bibo\`, không commit / push. Lệnh dài: `... 2>&1 | Select-Object -Last 15`. Ghi file bằng tool sửa file, không `Set-Content -Encoding utf8` (thêm BOM). Sau sửa code: build + lint + test. Đổi hành vi → sửa doc phần đó + `decisions.md` cùng lượt.
