# Canvas — Handoff (việc đang dở + câu chờ chốt)

Gọn lại 2026-10-13. Bản đầy đủ cũ (nhật ký 09-18 → 10-13): `docs/legacy/canvas-session-handoff-2026-10-13.md`, chỉ tra khi cần lý do lịch sử.

## Luật dùng file này

- Chỉ ghi: việc đang dở, việc chờ bạn test, chỗ hở chưa sửa, câu chờ chốt.
- Không ghi nhật ký, không mô tả kiến trúc. App chạy thế nào: `docs/system/` (tra `00-map.md`). Vì sao quyết vậy: `docs/system/decisions.md`.
- Xong việc → xoá dòng đó. Bạn chốt 1 câu → sửa doc + ghi `decisions.md` + xoá dòng ở đây.
- Ghi lệch code → tin code, sửa dòng ở đây.

## Việc còn mở

### Chờ bạn test tay

- Xoá lẫn board (2026-10-13, MCP không mở được trình duyệt nên chưa thử): D1 = chọn 1 board tile + 1 note → Delete → dialog "Xoá nhiều mục" đếm board + object → Xoá → cả 2 mất. D2 = Ctrl+Z 1 lần → cả 2 về, vào board con thấy nội dung đủ. D3 = chọn 2 board tile → Delete → xoá cả 2 cây (trước đây chỉ xoá tile đầu).

- Undo theo board (2026-10-14, Kiro thử MCP U1 pass): U1 = tạo note ở Home → vào board con → Ctrl+Z / Ctrl+Shift+Z không đổi gì, nút Undo mờ → về Home → Ctrl+Z xoá note, Ctrl+Shift+Z trả lại. U2 (chưa thử) = kéo note vào tile board con → vào board con → Ctrl+Z không làm gì → về Home → Ctrl+Z note quay lại Home, board con không còn note trong Khay chờ. U3 (chưa thử) = xoá vùng chọn có tile + note → vào board khác → về → Ctrl+Z.
- Unsort vạch chèn đo thật (2026-10-14, Kiro thử MCP pass bằng sự kiện giả): S1 = Khay chờ có note ngắn + item cao, kéo chuột thật lên / xuống giữa các item → vạch nằm đúng khe gần con trỏ, thả vào đúng chỗ vạch. S2 = đổi Kích thước giao diện trong Cài đặt rồi làm lại S1.
- Kéo nhiều object (2026-10-14, Kiro thử MCP 2 note pass): K1 = chọn 3 object rời nhau → kéo → thấy cả 3 bay theo chuột, giữ khoảng cách → thả trên canvas đúng chỗ. K2 = kéo cụm qua board tile → số đếm cộng 3, thả → cả 3 vào Khay chờ board đó. K3 = kéo cụm vào thùng rác / ra header → không còn object nào biến mất giữa chừng.
- `canvas-outbox`: O2 + O5 (kéo chuột thật, Copy số đo bảng dev). Spec `.kiro/specs/canvas-outbox/tasks.md`.
- `canvas-note-block-keys`: N1–N4 (`tasks.md` của spec).
- `version` (đã sửa 2026-10-13, Kiro test MCP pass V1–V3), thử lại nếu muốn: V1 = 2 tab, tab A sửa note 3 lần, tab B Ctrl+Z bước cũ → DevTools IndexedDB `bibo-canvas` / `objects`, version không lùi. V2 = 1 tab sửa → undo → redo, tăng đều.

### Hàng đợi ghi IndexedDB (chờ bạn quyết, chưa làm)

- `flush()` resolve cả khi còn mục ghi lỗi → nơi gọi không biết thành / bại. Đề xuất trả `drained` / `pending` + mốc thứ tự. Sửa ở `lib/write-queue.ts`.
- Thả nhiều item tách 2 lô (lô đầu 1 object): lần enqueue đầu kick ghi ngay. Sửa: hoãn tới cuối lượt chạy (microtask), không phải debounce.
- Kéo 1 item không ở trên cùng ghi 2 lần + 2 bước undo (`bringToFront` lúc bắt đầu + `commitMove` lúc thả, `useObjectDrag.ts`). Sửa đụng undo.
- Xoá board có board con không nằm trong 1 transaction (`deleteBoardCascade`): đóng tab giữa chừng có thể còn board thiếu object. Hướng: gom cả cây vào 1 lô (đụng `21`). Bạn chốt ghi hiện trạng 2026-10-13.

### Làm cùng `canvas-sync` (sau đăng nhập)

Thứ tự: đăng nhập trong app (Supabase Auth) → `canvas-sync` → `canvas-sharing`. Đọc `docs/system/21-server-sync.md` mục "Câu còn mở" + note `milanote-sync-architecture.md`, hướng dựng project `docs/supabase-setup.md`.

- Cột chủ sở hữu, bảng "board → project", client theo board.
- Gỡ nhãn tạm `OfflineBadge` (file + export `components/shared/index.ts` + 1 dòng `App.tsx`).
- `lib/idb.ts` chưa xử `onblocked`.
- `OUTBOX_ENABLED` đổi thành "đã đăng nhập + có Supabase", thay server giả bằng RPC; quyết "áp cả nhóm".

### Đang dở (không chặn việc trên)

- `i18n` Task 5-7: bạn chuyển nốt chữ cứng (~35 dòng, chủ yếu `Toolbar.tsx`, `NoteToolbar.tsx`, xem `03`), Kiro rà.
- Tính năng chưa làm: `canvas-backlog.md`. Ngoài canvas: `backlog.md`.

### Nhỏ, để sau

- Font app, lazy chunk Tiptap (route chunk ~580kb).
- `aria-label` nút Unsort lúc đang tải vẫn đọc "0".

## Luật cứng

Đã chuyển hết vào `docs/system/` (2026-10-13): `10` (`INV-CANVAS-*`), `11` (`INV-OBJ-*`), `12` (`INV-NOTE-*`), `20` (`INV-DATA-11`). Luật cứng mới chưa có chỗ trong doc thì ghi tạm ở đây.

## Câu chờ bạn chốt trong doc

Chi tiết ở mục "Câu còn mở" của từng phần. Ưu tiên theo mức ảnh hưởng:

- Lỗi thật:
  - `12`: Card Clipper lúc đang sửa (Kiro thử MCP 2026-10-14): bấm nút là thoát sửa, kéo không hiện bản xem trước, thả vẫn cắt đúng. Không ghi đè chữ. Chờ chốt hướng sửa.
- Hành vi cần quyết:
  - `12`: kéo góc tạo 2 bước undo; `fixed` nhỏ hơn 68; viền `outline-primary/40` từng đoạn.
  - `02`: font Plus Jakarta Sans không nạp; vệt shimmer trắng trên nền sáng; `active:cursor-grabbing` thừa; luật modal vào `02` hay `05`.
  - `05`: chặn giá trị lạ trong localStorage.
  - `30`: chặn Ctrl + lăn trên landing; dịch title `landing.html`.
- Chỉ cần xác nhận (code đã đổi so với spec cũ):
  - `02`: theme mặc định sáng, phong cách mặc định phẳng.
  - `03`: bỏ vùng `ACCOUNT` khỏi danh sách trong `coding-style.md`.
  - `04`: Mac chỉ đổi Ctrl → ⌘; dòng Markdown chỉ `*`; xoá dòng backlog "không tìm thấy" (đã có).
  - `05`: dòng backlog Chia sẻ / Xuất thuộc header canvas, không phải Cài đặt.
  - `10`: lăn = pan, resize 1 góc, URL chỉ id (xoá được `lib/slug.ts`), tab Unsort ẩn khi panel mở.
  - `30`: card demo dùng thẳng `DrawablyCard`; landing luôn sáng; landing là bản build riêng.
