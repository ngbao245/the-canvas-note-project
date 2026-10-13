# Task — Note tự lưu + Ctrl+Enter tạo note mới

**Trạng thái**: Xong (duyệt 2026-10-09, test thủ công pass hết 2026-10-11)

## Phase 1: Hàng đợi ghi + version

- [x] Task 1: Hàng đợi ghi IndexedDB + trường `version`
  - File: `src/tools/canvas/lib/` (hàng đợi, pure), `src/tools/canvas/api.ts` (mọi lệnh ghi / xoá object đi qua hàng đợi), `src/tools/canvas/types.ts` (thêm `version` mặc định 0)
  - Verify: kéo 1 object nhanh vài giây → DevTools thấy số lần ghi IndexedDB giảm hẳn so với trước; F5 → vị trí đúng; board có object cũ (chưa có version) vẫn mở bình thường; xoá rồi undo / redo object không bị "hồi sinh" sai.

- [x] Task 2: Đẩy ngay khi ẩn / đóng tab, đổi board + báo lỗi ghi
  - File: hàng đợi ở Task 1, chỗ nạp board (`route.tsx` / bootstrap), trạng thái lưu có sẵn
  - Verify: sửa vị trí object rồi đóng tab ngay → mở lại đúng; giả lập ghi lỗi (DevTools chặn IndexedDB / quota) → tiêu đề board hiện "Lưu lỗi", lần ghi sau thành công thì hết lỗi.

## Phase 2: Note tự lưu + khoá giữa tab

- [x] Task 3: Note tự lưu khi gõ + undo 1 bước mỗi lần sửa
  - File: `src/tools/canvas/components/objects/NoteObject.tsx`, `src/tools/canvas/engine/actions.ts`
  - Verify: gõ trong note rồi F5 ngay (không Esc) → chữ còn; gõ liên tục không khựng; thoát sửa → Ctrl+Z 1 lần về đúng nội dung trước khi sửa; vào sửa rồi thoát không đổi gì → không thêm bước undo; gõ tiếng Việt Telex bình thường.

- [x] Task 4: Khoá note giữa các tab + tab khác thấy nội dung mới
  - File: `src/tools/canvas/lib/` (khoá + kênh báo giữa tab), `NoteObject.tsx` / chỗ vào sửa, file dịch vi + en
  - Verify: mở 2 tab cùng board; tab A sửa note → tab B double-click bị chặn, thấy thông báo; tab A thoát → tab B sửa được; tab A đang sửa → tab B kéo / đổi màu / xoá note đó bị chặn; tab A gõ → tab B thấy chữ mới không cần F5; đóng tab A đang sửa → tab B sửa được ngay.

## Phase 3: Ctrl+Enter tạo note mới

- [x] Task 5: Ctrl+Enter lưu + tạo note mới bên dưới + vào sửa
  - File: `src/tools/canvas/lib/note-commit-keys.ts`, `NoteObject.tsx`, `src/tools/canvas/engine/actions.ts`, `src/tools/canvas/shortcuts.ts` (hiển thị), file dịch, `.kiro/specs/canvas-content-objects/requirements.md` (ghi chú deprecate), `.kiro/notes/canvas-session-handoff.md`
  - Verify: đang sửa note bấm Ctrl+Enter → note mới ngay bên dưới, con trỏ trong note mới, gõ được luôn; Ctrl+Z → note mới mất, note cũ giữ; Enter vẫn thêm đoạn; Esc / click ngoài vẫn thoát; modal phím tắt ghi đúng nghĩa mới; Mac dùng Cmd+Enter.

## Định nghĩa "xong" (paste khi báo task hoàn thành)

```
[ ] npm run build pass
[ ] npm run lint pass
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] Nếu đổi behavior: doc/spec liên quan đã update
```

## Test thủ công (ghi 2026-10-09, cập nhật 2026-10-11)

Đã pass hết (2026-10-11), kể cả B7, C5, C8, C9, C10, D1b test lại sau khi đổi khoá theo người chọn.

Phạm vi đã test: nhiều tab trong CÙNG 1 trình duyệt, cùng profile. Khác trình duyệt / khác profile / ẩn danh / khác máy là dữ liệu tách hẳn (IndexedDB, BroadcastChannel, Web Locks đều riêng theo profile), chưa có gì để khoá hay đồng bộ. Các case đó test khi có backend (`canvas-sync`, `canvas-sharing`).

Chuẩn bị: `npm run dev`, mở `/canvas`, có sẵn vài note. Báo lỗi theo mã (VD "C3").

**A. Hàng đợi (Task 1-2)**
1. DevTools → Application → IndexedDB → `bibo-canvas-objects`. Kéo note nhanh 3-4s, thả, F5 → đúng vị trí thả.
2. Kéo note, đóng tab ngay sau khi thả → mở lại đúng vị trí.
3. Xoá note, Ctrl+Z, Ctrl+Shift+Z, F5 → note không còn. Ctrl+Z rồi F5 → note có lại.
4. Board có note tạo trước 2026-10-09 vẫn mở bình thường.
5. Kéo note ở board A, vào board con, quay lại A → vị trí đúng.
6. Application → Storage → "Simulate custom storage quota" rất nhỏ, kéo note → header "Không lưu được". Tắt giả lập, kéo lại → hết lỗi. (Khó giả lập, không ra cũng được.)

**B. Note tự lưu (Task 3)**
1. Sửa note, gõ, F5 ngay không Esc → chữ còn.
2. Gõ rồi đóng tab khi đang sửa → mở lại chữ còn.
3. Gõ liên tục đoạn dài → không khựng.
4. Gõ Telex "tieesng vieejt" → đúng dấu, không mất chữ.
5. Vào sửa, gõ "abc", Esc, Ctrl+Z 1 lần → về đúng nội dung trước khi sửa. Ctrl+Shift+Z → "abc" lại.
6. Vào sửa, Esc không gõ, Ctrl+Z → lùi bước trước đó (lần sửa rỗng không tạo bước).
7. Vào sửa, gõ, click vùng trống → lưu, thoát sửa VÀ bỏ chọn (về canvas). Ctrl+Z lùi 1 bước. (Esc thì chỉ thoát sửa, note vẫn chọn.)

**A8 (thêm 2026-10-10).** Đang kéo note, chưa thả, bấm F5 → note về chỗ cũ (thả mới tính).
**A9.** Đang kéo góc resize note, chưa thả, bấm F5 → note về cỡ cũ.
**A10.** Kéo note rồi thả vào thùng rác, Ctrl+Z → note về đúng chỗ trước khi kéo (không phải chỗ đang kéo dở).

**C. Khoá giữa tab (Task 4)**, 2 tab cùng board. Lưu ý: 2 tab phải mở CÙNG 1 board (cùng URL). Mở 2 tab cùng lúc trên dữ liệu trống có thể sinh 2 board "Home" khác nhau (lỗi đã biết, xem handoff).
1. Tab A double-click note X, gõ dở.
2. Tab B double-click X → không vào sửa, thấy báo ở mép trên canvas.
3. Tab B click / kéo / marquee qua X / Ctrl+A rồi Delete → X không bị chọn, không di chuyển, không bị xoá.
4. Tab A gõ thêm → tab B thấy chữ mới, không F5.
5. Tab A Esc (note vẫn chọn) → tab B vẫn bị khoá. Tab A click vùng trống (bỏ chọn) → khoảng 1s sau tab B sửa được.
6. Tab A đang sửa X, đóng hẳn tab A → tab B sửa được ngay.
7. 2 tab sửa 2 note khác nhau cùng lúc → đều được.
8. Tab A chỉ click chọn X (không sửa) → tab B thấy viền vàng + badge "Bạn" ở X, không chọn / kéo / sửa được X.
9. Tab A chỉ đang chọn X, tab B bấm × trên badge → tab A bỏ chọn X + thấy báo bị lấy quyền, tab B hết badge và sửa được.
10. Tab B zoom 50% rồi 200% → badge co giãn theo note, luôn ở góc trên phải, pulse chỉ là quầng sáng (badge không phồng lên xẹp xuống).

Khoá theo người CHỌN (đổi 2026-10-11): chọn là khoá, không cần đang sửa. Chặn cứng giữa tab là hành vi có chủ đích, giống Milanote, không phải lỗi.

**D. Ctrl+Enter (Task 5)**
1. Đang sửa note, Ctrl+Enter → note mới ngay dưới (thẳng cạnh trái, cách 16px), con trỏ trong note mới, gõ được luôn.
1b. Chỉ chọn note (chưa sửa) rồi Ctrl+Enter → giống D1. Chọn 2 note trở lên thì Ctrl+Enter không làm gì.
2. Ctrl+Enter 3 lần liên tiếp có gõ chữ → ra 1 cột note.
3. Ctrl+Z ngay sau khi tạo → note mới mất, note cũ giữ chữ. Ctrl+Z tiếp → lùi lần sửa note cũ.
4. Enter vẫn thêm đoạn, Shift+Enter vẫn xuống dòng mềm.
5. Esc / click ngoài vẫn thoát sửa.
6. `/` mở modal phím tắt → nhóm Định dạng chữ có dòng Ctrl+Enter.
7. Note đã kéo góc cho cao → Ctrl+Enter tạo note dưới cạnh dưới thật, không đè.
